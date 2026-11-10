import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { evaluateRule } from '../runtime/choice.mjs';
import { validateDefinition } from '../runtime/definition.mjs';
import { loadFactory } from '../runtime/factory.mjs';
import { applyPayloadTemplate } from '../runtime/intrinsics.mjs';
import { readPath, writePath } from '../runtime/jsonpath.mjs';
import { createStatesService } from '../runtime/service.mjs';
import { checkPrd } from '../functions/validate-prd.mjs';
import { parseStories } from '../functions/lib/markdown.mjs';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'factory-runtime-'));

const namedError = (name, message) => Object.assign(new Error(message), { name });

function harness(definition, handlers) {
  let clock = Date.parse('2026-01-01T00:00:00.000Z');
  const resources = new Map();
  for (const [placeholder, handler] of Object.entries(handlers)) {
    resources.set(
      placeholder,
      handler === 'activity'
        ? { type: 'activity', name: placeholder, arn: `arn:local:states:::activity:${placeholder}` }
        : { type: 'function', name: placeholder, arn: `arn:local:lambda:::function:${placeholder}`, invoke: handler },
    );
  }
  const states = createStatesService({
    stateMachineName: 'test',
    definition,
    resources,
    executionRoot: tempDir(),
    now: () => new Date(clock),
  });
  return { states, advance: (seconds) => (clock += seconds * 1000) };
}

const describe = async (states, name) => states.describeExecution({ executionArn: name });
const historyTypes = async (states, name) => (await states.getExecutionHistory({ executionArn: name })).events.map((event) => event.type);

const askDefinition = {
  StartAt: 'Prepare',
  States: {
    Prepare: {
      Type: 'Task',
      Resource: '${Prepare}',
      Parameters: { 'name.$': '$.name', 'execution.$': '$$.Execution.Name' },
      ResultPath: '$.prepared',
      Retry: [{ ErrorEquals: ['Custom.Transient'], IntervalSeconds: 1, MaxAttempts: 1 }],
      Catch: [{ ErrorEquals: ['States.ALL'], ResultPath: '$.error', Next: 'Failed' }],
      Next: 'Ask',
    },
    Ask: {
      Type: 'Task',
      Resource: '${Worker}',
      Parameters: { 'greeting.$': "States.Format('hi {}', $.prepared.name)" },
      ResultPath: '$.answer',
      TimeoutSeconds: 60,
      Catch: [{ ErrorEquals: ['States.Timeout'], ResultPath: '$.error', Next: 'Failed' }],
      Next: 'Route',
    },
    Route: {
      Type: 'Choice',
      Choices: [{ Variable: '$.answer.ok', BooleanEquals: true, Next: 'Done' }],
      Default: 'Failed',
    },
    Done: { Type: 'Succeed', OutputPath: '$.answer' },
    Failed: { Type: 'Fail', ErrorPath: '$.error.Error', CausePath: '$.error.Cause' },
  },
};

test('JSONPath reads nulls, rejects missing paths, and writes ResultPath into a copy', () => {
  const input = { run: { feedback: null, list: [1, 2] } };
  assert.equal(readPath('$.run.feedback', input), null);
  assert.equal(readPath("$['run'].list[1]", input), 2);
  assert.throws(() => readPath('$.run.missing', input), { name: 'States.Runtime' });

  const written = writePath(input, '$.run.feedback', { Error: 'X' });
  assert.deepEqual(written.run.feedback, { Error: 'X' });
  assert.equal(input.run.feedback, null);
  assert.deepEqual(writePath(input, '$.a.b', 1).a, { b: 1 });
});

test('Payload templates evaluate paths, the context object, and intrinsics', () => {
  const out = applyPayloadTemplate(
    {
      static: 'kept',
      'key.$': "States.Format('{}prd.md', $.staging)",
      'has.$': "States.ArrayContains($.ids, 'US-002')",
      'count.$': 'States.ArrayLength($.ids)',
      'name.$': '$$.Execution.Name',
      nested: [{ 'sum.$': 'States.MathAdd($.n, 1)' }],
    },
    { staging: 'staging/x/', ids: ['US-001', 'US-002'], n: 2 },
    { Execution: { Name: 'run-1' } },
  );
  assert.deepEqual(out, { static: 'kept', key: 'staging/x/prd.md', has: true, count: 2, name: 'run-1', nested: [{ sum: 3 }] });
  assert.throws(() => applyPayloadTemplate({ 'x.$': "States.Format('{} {}', $.n)" }, { n: 1 }), { name: 'States.IntrinsicFailure' });
});

test('Choice rules support compound operators and type tests', () => {
  const input = { run: { mode: 'forward', round: 2, flags: null } };
  assert.equal(evaluateRule({ And: [{ Variable: '$.run.mode', StringEquals: 'forward' }, { Variable: '$.run.round', NumericLessThan: 3 }] }, input), true);
  assert.equal(evaluateRule({ Not: { Variable: '$.run.mode', StringMatches: 'rev*' } }, input), true);
  assert.equal(evaluateRule({ Variable: '$.run.missing', IsPresent: false }, input), true);
  assert.equal(evaluateRule({ Variable: '$.run.flags', IsNull: true }, input), true);
});

test('validateDefinition reports the problems AWS would reject', () => {
  const codes = (definition) => validateDefinition(definition, new Set(['Fn'])).map((d) => d.code);
  assert.deepEqual(codes({ StartAt: 'A', States: { A: { Type: 'Task', Resource: '${Fn}', End: true } } }), []);
  assert.ok(codes({ StartAt: 'A', States: { A: { Type: 'Pass', Next: 'Nowhere' } } }).includes('MISSING_TRANSITION_TARGET'));
  assert.ok(codes({ StartAt: 'A', States: { A: { Type: 'Succeed' }, B: { Type: 'Succeed' } } }).includes('UNREACHABLE_STATE'));
  assert.ok(codes({ StartAt: 'A', States: { A: { Type: 'Map', End: true } } }).includes('SCHEMA_VALIDATION_FAILED'));
  assert.ok(codes({ StartAt: 'A', States: { A: { Type: 'Task', Resource: '${Missing}', End: true } } }).includes('SCHEMA_VALIDATION_FAILED'));
  assert.ok(
    codes({
      StartAt: 'A',
      States: { A: { Type: 'Task', Resource: '${Fn}', Catch: [{ ErrorEquals: ['States.ALL', 'X'], Next: 'A' }], End: true } },
    }).includes('SCHEMA_VALIDATION_FAILED'),
  );
  assert.ok(codes({ StartAt: 'A', States: { A: { Type: 'Pass', Parameters: { 'x.$': 'nope' }, End: true } } }).includes('INVALID_JSON_PATH'));
});

test('The shipped definition, resource map, and config validate clean', () => {
  assert.deepEqual(loadFactory().validate(), []);
});

test('Functions retry, activities hand out each task once, and history mirrors Step Functions', async () => {
  let calls = 0;
  const { states } = harness(askDefinition, {
    Prepare: async (event) => {
      calls += 1;
      if (calls === 1) throw namedError('Custom.Transient', 'try again');
      return { name: event.name, execution: event.execution };
    },
    Worker: 'activity',
  });

  const started = await states.startExecution({ name: 'ask-1', input: JSON.stringify({ name: 'Ada' }) });
  assert.equal(started.local.currentState, 'Ask');
  assert.equal(calls, 2);

  const claimed = await states.getActivityTask({ activityArn: 'arn:local:states:::activity:Worker', workerName: 'w1' });
  assert.deepEqual(JSON.parse(claimed.input), { greeting: 'hi Ada' });
  assert.deepEqual(await states.getActivityTask({ activityArn: 'Worker' }), {});

  await assert.rejects(states.sendTaskSuccess({ taskToken: 'bogus', output: '{}' }), { code: 'InvalidToken' });
  await assert.rejects(states.sendTaskSuccess({ taskToken: claimed.taskToken, output: '{not json' }), { code: 'InvalidOutput' });
  const done = await states.sendTaskSuccess({ taskToken: claimed.taskToken, output: JSON.stringify({ ok: true }) });
  assert.equal(done.local.status, 'SUCCEEDED');
  await assert.rejects(states.sendTaskSuccess({ taskToken: claimed.taskToken, output: '{}' }), { code: 'TaskDoesNotExist' });

  const execution = await describe(states, 'ask-1');
  assert.equal(execution.output, JSON.stringify({ ok: true }));
  assert.equal(typeof execution.input, 'string');

  const { events } = await states.getExecutionHistory({ executionArn: 'ask-1' });
  assert.deepEqual(
    events.map((event) => event.type),
    [
      'ExecutionStarted',
      'TaskStateEntered',
      'LambdaFunctionScheduled',
      'LambdaFunctionStarted',
      'LambdaFunctionFailed',
      'LambdaFunctionScheduled',
      'LambdaFunctionStarted',
      'LambdaFunctionSucceeded',
      'TaskStateExited',
      'TaskStateEntered',
      'ActivityScheduled',
      'ActivityStarted',
      'ActivitySucceeded',
      'TaskStateExited',
      'ChoiceStateEntered',
      'ChoiceStateExited',
      'SucceedStateEntered',
      'SucceedStateExited',
      'ExecutionSucceeded',
    ],
  );
  events.forEach((event, index) => {
    assert.equal(event.id, index + 1);
    assert.equal(event.previousEventId, index);
  });
  assert.equal(events[1].stateEnteredEventDetails.name, 'Prepare');
  assert.equal(events[4].lambdaFunctionFailedEventDetails.error, 'Custom.Transient');
  assert.deepEqual(JSON.parse(events[4].lambdaFunctionFailedEventDetails.cause), { errorType: 'Custom.Transient', errorMessage: 'try again' });
  assert.equal(events[11].activityStartedEventDetails.workerName, 'w1');
  assert.equal(events[10].activityScheduledEventDetails.timeoutInSeconds, 60);
});

test('Catch routes a function error to a Fail state that reads ErrorPath and CausePath', async () => {
  const { states } = harness(askDefinition, {
    Prepare: async () => {
      throw namedError('Custom.Fatal', 'broken');
    },
    Worker: 'activity',
  });
  await states.startExecution({ name: 'fatal', input: JSON.stringify({ name: 'Ada' }) });
  const execution = await describe(states, 'fatal');
  assert.equal(execution.status, 'FAILED');
  assert.equal(execution.error, 'Custom.Fatal');
  assert.equal(JSON.parse(execution.cause).errorMessage, 'broken');
});

test('States.ALL does not catch States.Runtime', async () => {
  const { states } = harness(askDefinition, { Prepare: async () => ({}), Worker: 'activity' });
  await states.startExecution({ name: 'no-name', input: '{}' });
  const execution = await describe(states, 'no-name');
  assert.equal(execution.status, 'FAILED');
  assert.equal(execution.error, 'States.Runtime');
  assert.deepEqual((await historyTypes(states, 'no-name')).slice(-1), ['ExecutionFailed']);
});

test('An expired activity times out into its States.Timeout Catch', async () => {
  const { states, advance } = harness(askDefinition, { Prepare: async (event) => event, Worker: 'activity' });
  await states.startExecution({ name: 'slow', input: JSON.stringify({ name: 'Ada' }) });
  advance(59);
  assert.equal((await states.listActivityTasks()).tasks.length, 1);
  advance(2);
  assert.equal((await states.listActivityTasks()).tasks.length, 0);
  const execution = await describe(states, 'slow');
  assert.equal(execution.status, 'FAILED');
  assert.equal(execution.error, 'States.Timeout');
  assert.ok((await historyTypes(states, 'slow')).includes('ActivityTimedOut'));
});

test('A function timeout is States.Timeout, which States.TaskFailed does not catch', async () => {
  const definition = {
    StartAt: 'Hang',
    States: {
      Hang: {
        Type: 'Task',
        Resource: '${Hang}',
        TimeoutSeconds: 1,
        Catch: [{ ErrorEquals: ['States.TaskFailed'], Next: 'Caught' }],
        End: true,
      },
      Caught: { Type: 'Succeed' },
    },
  };
  const { states } = harness(definition, { Hang: () => new Promise(() => {}) });
  await states.startExecution({ name: 'hang', input: '{}' });
  const execution = await describe(states, 'hang');
  assert.equal(execution.status, 'FAILED');
  assert.equal(execution.error, 'States.Timeout');
  assert.ok((await historyTypes(states, 'hang')).includes('LambdaFunctionTimedOut'));
});

test('StopExecution aborts and withdraws the pending task; names are unique and validated', async () => {
  const { states } = harness(askDefinition, { Prepare: async (event) => event, Worker: 'activity' });
  await states.startExecution({ name: 'stop-me', input: JSON.stringify({ name: 'Ada' }) });
  await assert.rejects(states.startExecution({ name: 'stop-me', input: '{}' }), { code: 'ExecutionAlreadyExists' });
  await assert.rejects(states.startExecution({ name: 'bad name!', input: '{}' }), { code: 'InvalidName' });
  await assert.rejects(states.startExecution({ name: 'bad-json', input: '{' }), { code: 'InvalidExecutionInput' });

  await states.stopExecution({ executionArn: 'stop-me', error: 'User.Stopped' });
  assert.equal((await describe(states, 'stop-me')).status, 'ABORTED');
  assert.deepEqual((await states.listActivityTasks()).tasks, []);
  assert.deepEqual((await historyTypes(states, 'stop-me')).slice(-1), ['ExecutionAborted']);
  await assert.rejects(describe(states, 'nope'), { code: 'ExecutionDoesNotExist' });
});

test('checkPrd derives required sections from the template and needs stories with criteria', () => {
  const template = '---\ntitle: {{x}}\n---\n\n## Goals\n\n## User stories\n';
  assert.deepEqual(checkPrd('---\ntitle: Shop\n---\n\n## Goals\n\nSell.\n\n## User stories\n\n### US-001: Buy\n\nAcceptance criteria:\n\n- Pays\n', template), []);
  const problems = checkPrd('## Goals\n\n### US-001: Buy\n\n### US-001: Again\n\n{{todo}}\n', template);
  assert.deepEqual(problems, [
    'The file must start with front matter that sets "title"',
    'Missing section "## User stories"',
    'Template placeholders ({{...}}) are still present',
    'US-001 needs an "Acceptance criteria:" line followed by "- " bullets',
    'Duplicate story id US-001',
    'US-001 needs an "Acceptance criteria:" line followed by "- " bullets',
  ]);
});

test('parseStories ignores fenced examples and reads heading-style criteria', () => {
  const stories = parseStories('```\n### US-009: Example\n```\n\n### US-001: Real\n\n#### Acceptance criteria\n\n- [ ] One\n* Two\n');
  assert.deepEqual(stories, [{ id: 'US-001', title: 'Real', acceptanceCriteria: ['One', 'Two'] }]);
});

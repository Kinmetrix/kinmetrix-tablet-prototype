import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { evaluateRule } from './choice.mjs';
import { resourcePlaceholder } from './definition.mjs';
import { ServiceError, StatesError } from './errors.mjs';
import { applyPayloadTemplate } from './intrinsics.mjs';
import { readPath, writePath } from './jsonpath.mjs';

const MAX_EVENTS = 25_000;
const EXECUTION_NAME = /^[A-Za-z0-9_-]{1,80}$/;
const TASK_TOKEN = /^[a-f0-9]{64}$/;

const toJson = (value) => JSON.stringify(value ?? null);
const lowerFirst = (text) => text[0].toLowerCase() + text.slice(1);
const detailsKey = (type) => {
  if (type.endsWith('StateEntered')) return 'stateEnteredEventDetails';
  if (type.endsWith('StateExited')) return 'stateExitedEventDetails';
  return `${lowerFirst(type)}EventDetails`;
};

function errorMatches(errorEquals, error) {
  return errorEquals.some(
    (name) =>
      name === error ||
      (name === 'States.ALL' && error !== 'States.Runtime') ||
      (name === 'States.TaskFailed' && error !== 'States.Timeout' && error !== 'States.Runtime'),
  );
}

function applyInputPath(raw, inputPath, context) {
  if (inputPath === undefined) return raw;
  if (inputPath === null) return {};
  return readPath(inputPath, raw, context);
}

function applyResultPath(raw, result, resultPath) {
  if (resultPath === undefined) return result;
  if (resultPath === null) return raw;
  return writePath(raw, resultPath, result);
}

function applyOutputPath(output, outputPath, context) {
  if (outputPath === undefined) return output;
  if (outputPath === null) return {};
  return readPath(outputPath, output, context);
}

function asTaskFailure(error) {
  if (error instanceof StatesError && error.name === 'States.Timeout') return { error: error.name, cause: error.message };
  const errorType = typeof error?.name === 'string' && error.name ? error.name : 'Error';
  return { error: errorType, cause: JSON.stringify({ errorType, errorMessage: String(error?.message ?? error) }) };
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/**
 * Local Step Functions service: runs one ASL state machine with Lambda-style function
 * resources and activity resources, persisting executions, history, and activity tasks
 * under `executionRoot`. The public API mirrors the Step Functions API.
 */
export function createStatesService({ stateMachineName, definition, resources, executionRoot, functionContext = {}, now = () => new Date() }) {
  const stateMachineArn = `arn:local:states:::stateMachine:${stateMachineName}`;
  const executionArnFor = (name) => `arn:local:states:::execution:${stateMachineName}:${name}`;
  const tasksDir = path.join(executionRoot, '.activity-tasks');
  const activities = new Map([...resources.values()].filter((r) => r.type === 'activity').map((r) => [r.name, r]));

  const executionDir = (name) => path.join(executionRoot, name);
  const recordFile = (name) => path.join(executionDir(name), 'execution.json');
  const historyFile = (name) => path.join(executionDir(name), 'history.jsonl');
  const taskFile = (token) => path.join(tasksDir, `${token}.json`);
  const nowIso = () => now().toISOString();

  const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
  const writeJson = (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temp, file);
  };

  const nameFromArn = (value, kind) => {
    if (typeof value !== 'string' || value === '') throw new ServiceError('InvalidArn', `Missing ${kind} ARN or name`);
    return value.split(':').at(-1);
  };

  function loadExecution(name) {
    if (!EXECUTION_NAME.test(name) || !fs.existsSync(recordFile(name))) {
      throw new ServiceError('ExecutionDoesNotExist', `Execution does not exist: ${executionArnFor(name)}`);
    }
    return readJson(recordFile(name));
  }
  const saveExecution = (exec) => writeJson(recordFile(exec.name), exec);

  function readTask(token) {
    if (typeof token !== 'string' || !TASK_TOKEN.test(token)) throw new ServiceError('InvalidToken', 'Invalid task token');
    if (!fs.existsSync(taskFile(token))) throw new ServiceError('TaskDoesNotExist', 'Task does not exist or has already completed');
    return readJson(taskFile(token));
  }
  const listTasks = () =>
    fs.existsSync(tasksDir)
      ? fs
          .readdirSync(tasksDir)
          .filter((file) => file.endsWith('.json'))
          .map((file) => readJson(path.join(tasksDir, file)))
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      : [];

  function acquireLock(lockFile, name) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx' });
        return;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const holder = Number(fs.readFileSync(lockFile, 'utf8'));
        if (holder && isAlive(holder)) throw new ServiceError('ExecutionBusy', `Execution ${name} is being advanced by process ${holder}`);
        fs.rmSync(lockFile, { force: true });
      }
    }
    throw new ServiceError('ExecutionBusy', `Could not lock execution ${name}`);
  }

  async function withExecutionLock(name, work) {
    const lockFile = path.join(executionDir(name), '.lock');
    acquireLock(lockFile, name);
    try {
      return await work();
    } finally {
      fs.rmSync(lockFile, { force: true });
    }
  }

  async function skipBusy(work) {
    try {
      await work();
    } catch (error) {
      if (!(error instanceof ServiceError && error.code === 'ExecutionBusy')) throw error;
    }
  }

  function emit(exec, type, details) {
    exec.eventCount += 1;
    const event = { timestamp: nowIso(), type, id: exec.eventCount, previousEventId: exec.eventCount - 1 };
    if (details) event[detailsKey(type)] = details;
    fs.appendFileSync(historyFile(exec.name), `${JSON.stringify(event)}\n`);
  }

  const contextObject = (exec) => ({
    Execution: { Id: exec.executionArn, Name: exec.name, Input: exec.input, StartTime: exec.startDate },
    StateMachine: { Id: stateMachineArn, Name: stateMachineName },
    State: exec.cursor
      ? {
          Name: exec.cursor.stateName,
          EnteredTime: exec.cursor.enteredTime,
          RetryCount: Object.values(exec.cursor.retries).reduce((sum, count) => sum + count, 0),
        }
      : {},
  });

  function enterState(exec, stateName, input) {
    exec.cursor = { stateName, rawInput: input, enteredTime: nowIso(), retries: {}, notBefore: null, pendingTaskToken: null };
    emit(exec, `${definition.States[stateName].Type}StateEntered`, { name: stateName, input: toJson(input) });
  }

  function succeed(exec, output) {
    Object.assign(exec, { status: 'SUCCEEDED', output, stopDate: nowIso(), cursor: null });
    emit(exec, 'ExecutionSucceeded', { output: toJson(output) });
  }

  function fail(exec, error, cause) {
    const token = exec.cursor?.pendingTaskToken;
    if (token) fs.rmSync(taskFile(token), { force: true });
    Object.assign(exec, { status: 'FAILED', error: error ?? null, cause: cause ?? null, stopDate: nowIso(), cursor: null });
    emit(exec, 'ExecutionFailed', { ...(error ? { error } : {}), ...(cause ? { cause } : {}) });
  }

  function exitState(exec, state, output) {
    emit(exec, `${state.Type}StateExited`, { name: exec.cursor.stateName, output: toJson(output) });
    if (state.End) succeed(exec, output);
    else enterState(exec, state.Next, output);
  }

  function finishTask(exec, state, result) {
    const context = contextObject(exec);
    const selected = state.ResultSelector === undefined ? result : applyPayloadTemplate(state.ResultSelector, result, context);
    exitState(exec, state, applyOutputPath(applyResultPath(exec.cursor.rawInput, selected, state.ResultPath), state.OutputPath, context));
  }

  function handleTaskError(exec, state, { error, cause }) {
    const retriers = state.Retry ?? [];
    const index = retriers.findIndex((retrier) => errorMatches(retrier.ErrorEquals, error));
    if (index !== -1) {
      const retrier = retriers[index];
      const attempts = exec.cursor.retries[index] ?? 0;
      if (attempts < (retrier.MaxAttempts ?? 3)) {
        exec.cursor.retries[index] = attempts + 1;
        const delaySeconds = (retrier.IntervalSeconds ?? 1) * (retrier.BackoffRate ?? 2) ** attempts;
        exec.cursor.notBefore = new Date(now().getTime() + delaySeconds * 1000).toISOString();
        return;
      }
    }
    const catcher = (state.Catch ?? []).find((entry) => errorMatches(entry.ErrorEquals, error));
    if (catcher) {
      enterState(exec, catcher.Next, applyResultPath(exec.cursor.rawInput, { Error: error, Cause: cause }, catcher.ResultPath));
      return;
    }
    fail(exec, error, cause);
  }

  async function invokeFunction(resource, event, timeoutSeconds) {
    const deadline = timeoutSeconds ? Date.now() + timeoutSeconds * 1000 : null;
    const context = {
      functionName: resource.name,
      invokedFunctionArn: resource.arn,
      awsRequestId: randomUUID(),
      getRemainingTimeInMillis: () => (deadline ? Math.max(0, deadline - Date.now()) : Number.MAX_SAFE_INTEGER),
      factory: { ...functionContext, states: internalApi },
    };
    const invocation = Promise.resolve().then(() => resource.invoke(structuredClone(event), context));
    let timer;
    const timeout = deadline
      ? new Promise((_, reject) => {
          timer = setTimeout(() => reject(new StatesError('States.Timeout', `Task timed out after ${timeoutSeconds} seconds`)), timeoutSeconds * 1000);
        })
      : null;
    try {
      const value = await (timeout ? Promise.race([invocation, timeout]) : invocation);
      return JSON.parse(toJson(value));
    } finally {
      clearTimeout(timer);
    }
  }

  function scheduleActivity(exec, state, resource, input) {
    const token = randomBytes(32).toString('hex');
    const scheduledAt = now();
    writeJson(taskFile(token), {
      taskToken: token,
      activityArn: resource.arn,
      activityName: resource.name,
      executionArn: exec.executionArn,
      executionName: exec.name,
      stateName: exec.cursor.stateName,
      input,
      scheduledAt: scheduledAt.toISOString(),
      notBefore: exec.cursor.notBefore,
      startedAt: null,
      workerName: null,
      timeoutAt: state.TimeoutSeconds ? new Date(scheduledAt.getTime() + state.TimeoutSeconds * 1000).toISOString() : null,
    });
    exec.cursor.pendingTaskToken = token;
    exec.cursor.notBefore = null;
    emit(exec, 'ActivityScheduled', {
      resource: resource.arn,
      input: toJson(input),
      ...(state.TimeoutSeconds ? { timeoutInSeconds: state.TimeoutSeconds } : {}),
    });
  }

  async function runTask(exec, state, context) {
    let effective = applyInputPath(exec.cursor.rawInput, state.InputPath, context);
    if (state.Parameters !== undefined) effective = applyPayloadTemplate(state.Parameters, effective, context);
    const resource = resources.get(resourcePlaceholder(state.Resource));
    if (resource.type === 'activity') {
      scheduleActivity(exec, state, resource, effective);
      return;
    }

    const waitMs = exec.cursor.notBefore ? Date.parse(exec.cursor.notBefore) - now().getTime() : 0;
    if (waitMs > 0) await sleep(waitMs);
    exec.cursor.notBefore = null;
    emit(exec, 'LambdaFunctionScheduled', {
      resource: resource.arn,
      input: toJson(effective),
      ...(state.TimeoutSeconds ? { timeoutInSeconds: state.TimeoutSeconds } : {}),
    });
    emit(exec, 'LambdaFunctionStarted');
    let result;
    try {
      result = await invokeFunction(resource, effective, state.TimeoutSeconds);
    } catch (error) {
      const failure = asTaskFailure(error);
      emit(exec, failure.error === 'States.Timeout' ? 'LambdaFunctionTimedOut' : 'LambdaFunctionFailed', failure);
      handleTaskError(exec, state, failure);
      return;
    }
    emit(exec, 'LambdaFunctionSucceeded', { output: toJson(result) });
    finishTask(exec, state, result);
  }

  async function step(exec) {
    const { stateName, rawInput } = exec.cursor;
    const state = definition.States[stateName];
    const context = contextObject(exec);
    switch (state.Type) {
      case 'Pass': {
        let effective = applyInputPath(rawInput, state.InputPath, context);
        if (state.Parameters !== undefined) effective = applyPayloadTemplate(state.Parameters, effective, context);
        const result = Object.hasOwn(state, 'Result') ? state.Result : effective;
        exitState(exec, state, applyOutputPath(applyResultPath(rawInput, result, state.ResultPath), state.OutputPath, context));
        return;
      }
      case 'Choice': {
        const effective = applyInputPath(rawInput, state.InputPath, context);
        const match = state.Choices.find((rule) => evaluateRule(rule, effective, context));
        const next = match?.Next ?? state.Default;
        if (!next) throw new StatesError('States.NoChoiceMatched', `No Choice rule matched in '${stateName}' and it has no Default`);
        const output = applyOutputPath(effective, state.OutputPath, context);
        emit(exec, 'ChoiceStateExited', { name: stateName, output: toJson(output) });
        enterState(exec, next, output);
        return;
      }
      case 'Succeed': {
        const output = applyOutputPath(applyInputPath(rawInput, state.InputPath, context), state.OutputPath, context);
        emit(exec, 'SucceedStateExited', { name: stateName, output: toJson(output) });
        succeed(exec, output);
        return;
      }
      case 'Fail': {
        const asText = (value) => (value === undefined || value === null || typeof value === 'string' ? value : JSON.stringify(value));
        const error = state.ErrorPath ? readPath(state.ErrorPath, rawInput, context) : state.Error;
        const cause = state.CausePath ? readPath(state.CausePath, rawInput, context) : state.Cause;
        fail(exec, asText(error), asText(cause));
        return;
      }
      case 'Task':
        await runTask(exec, state, context);
        return;
      default:
        throw new StatesError('States.Runtime', `Unsupported state type '${state.Type}'`);
    }
  }

  async function guarded(exec, work) {
    try {
      await work();
    } catch (error) {
      if (!(error instanceof StatesError)) throw error;
      fail(exec, error.name, error.message);
    }
  }

  async function drive(exec) {
    while (exec.status === 'RUNNING' && exec.cursor && !exec.cursor.pendingTaskToken) {
      if (exec.eventCount >= MAX_EVENTS) {
        fail(exec, 'States.Runtime', `Execution history exceeded ${MAX_EVENTS} events`);
        break;
      }
      await guarded(exec, () => step(exec));
      saveExecution(exec);
    }
    saveExecution(exec);
  }

  function summarize(exec) {
    const token = exec.cursor?.pendingTaskToken;
    const task = token && fs.existsSync(taskFile(token)) ? readJson(taskFile(token)) : null;
    return {
      executionArn: exec.executionArn,
      status: exec.status,
      currentState: exec.cursor?.stateName ?? null,
      waitingOn: task
        ? { activityArn: task.activityArn, stateName: task.stateName, claimed: Boolean(task.startedAt), timeoutAt: task.timeoutAt }
        : null,
    };
  }

  function describe(exec) {
    return {
      executionArn: exec.executionArn,
      stateMachineArn: exec.stateMachineArn,
      name: exec.name,
      status: exec.status,
      startDate: exec.startDate,
      ...(exec.stopDate ? { stopDate: exec.stopDate } : {}),
      input: toJson(exec.input),
      ...(exec.status === 'SUCCEEDED' ? { output: toJson(exec.output) } : {}),
      ...(exec.error !== null ? { error: exec.error } : {}),
      ...(exec.cause !== null ? { cause: exec.cause } : {}),
      local: summarize(exec),
    };
  }

  function listExecutionsRaw({ statusFilter } = {}) {
    if (!fs.existsSync(executionRoot)) return [];
    return fs
      .readdirSync(executionRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && EXECUTION_NAME.test(entry.name) && fs.existsSync(recordFile(entry.name)))
      .map((entry) => readJson(recordFile(entry.name)))
      .filter((exec) => !statusFilter || exec.status === statusFilter)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((exec) => ({
        executionArn: exec.executionArn,
        stateMachineArn: exec.stateMachineArn,
        name: exec.name,
        status: exec.status,
        startDate: exec.startDate,
        ...(exec.stopDate ? { stopDate: exec.stopDate } : {}),
      }));
  }

  /** Converges stored state: times out expired activity tasks, drops orphaned tasks, and resumes stalled executions. */
  async function reconcile() {
    for (const task of listTasks()) {
      if (!fs.existsSync(executionDir(task.executionName))) {
        fs.rmSync(taskFile(task.taskToken), { force: true });
        continue;
      }
      await skipBusy(() =>
        withExecutionLock(task.executionName, async () => {
          if (!fs.existsSync(taskFile(task.taskToken))) return;
          const exec = fs.existsSync(recordFile(task.executionName)) ? readJson(recordFile(task.executionName)) : null;
          if (!exec || exec.status !== 'RUNNING' || exec.cursor?.pendingTaskToken !== task.taskToken) {
            fs.rmSync(taskFile(task.taskToken), { force: true });
            return;
          }
          if (!task.timeoutAt || task.timeoutAt > nowIso()) return;
          fs.rmSync(taskFile(task.taskToken), { force: true });
          const state = definition.States[exec.cursor.stateName];
          emit(exec, 'ActivityTimedOut', { error: 'States.Timeout' });
          exec.cursor.pendingTaskToken = null;
          await guarded(exec, () =>
            handleTaskError(exec, state, { error: 'States.Timeout', cause: `Activity task was not completed within ${state.TimeoutSeconds} seconds` }),
          );
          await drive(exec);
        }),
      );
    }
    for (const { name } of listExecutionsRaw({ statusFilter: 'RUNNING' })) {
      const exec = readJson(recordFile(name));
      if (!exec.cursor || exec.cursor.pendingTaskToken) continue;
      await skipBusy(() =>
        withExecutionLock(name, async () => {
          const fresh = loadExecution(name);
          if (fresh.status === 'RUNNING' && fresh.cursor && !fresh.cursor.pendingTaskToken) await drive(fresh);
        }),
      );
    }
  }

  async function completeTask(taskToken, complete) {
    const task = readTask(taskToken);
    let summary;
    await withExecutionLock(task.executionName, async () => {
      const exec = loadExecution(task.executionName);
      if (!fs.existsSync(taskFile(taskToken))) throw new ServiceError('TaskDoesNotExist', 'Task does not exist or has already completed');
      fs.rmSync(taskFile(taskToken), { force: true });
      if (exec.status !== 'RUNNING' || exec.cursor?.pendingTaskToken !== taskToken) {
        throw new ServiceError('TaskDoesNotExist', 'Task is no longer pending for its execution');
      }
      if (!task.startedAt) emit(exec, 'ActivityStarted');
      exec.cursor.pendingTaskToken = null;
      const state = definition.States[exec.cursor.stateName];
      await guarded(exec, () => complete(exec, state));
      await drive(exec);
      summary = summarize(exec);
    });
    return { local: summary };
  }

  const api = {
    async startExecution({ input = '{}', name } = {}) {
      await reconcile();
      const executionName = name ?? randomUUID();
      if (!EXECUTION_NAME.test(executionName)) {
        throw new ServiceError('InvalidName', 'Execution name must be 1-80 characters of letters, digits, hyphens, or underscores');
      }
      let parsed;
      try {
        parsed = JSON.parse(input);
      } catch {
        throw new ServiceError('InvalidExecutionInput', 'Execution input is not valid JSON');
      }
      if (fs.existsSync(executionDir(executionName))) {
        throw new ServiceError('ExecutionAlreadyExists', `Execution already exists: ${executionArnFor(executionName)}`);
      }
      fs.mkdirSync(executionDir(executionName), { recursive: true });
      const exec = {
        executionArn: executionArnFor(executionName),
        stateMachineArn,
        name: executionName,
        status: 'RUNNING',
        startDate: nowIso(),
        stopDate: null,
        input: parsed,
        output: null,
        error: null,
        cause: null,
        cursor: null,
        eventCount: 0,
      };
      saveExecution(exec);
      await withExecutionLock(executionName, async () => {
        emit(exec, 'ExecutionStarted', { input: toJson(parsed) });
        enterState(exec, definition.StartAt, parsed);
        await drive(exec);
      });
      return { executionArn: exec.executionArn, startDate: exec.startDate, local: summarize(exec) };
    },

    async describeExecution({ executionArn }) {
      await reconcile();
      return describe(loadExecution(nameFromArn(executionArn, 'execution')));
    },

    async listExecutions({ statusFilter } = {}) {
      await reconcile();
      return { executions: listExecutionsRaw({ statusFilter }) };
    },

    async getExecutionHistory({ executionArn, reverseOrder = false }) {
      const exec = loadExecution(nameFromArn(executionArn, 'execution'));
      const lines = fs.existsSync(historyFile(exec.name)) ? fs.readFileSync(historyFile(exec.name), 'utf8').split('\n').filter(Boolean) : [];
      const events = lines.map((line) => JSON.parse(line));
      return { events: reverseOrder ? events.reverse() : events };
    },

    async stopExecution({ executionArn, error, cause }) {
      await reconcile();
      const name = nameFromArn(executionArn, 'execution');
      return withExecutionLock(name, async () => {
        const exec = loadExecution(name);
        if (exec.status !== 'RUNNING') return { stopDate: exec.stopDate };
        const token = exec.cursor?.pendingTaskToken;
        if (token) fs.rmSync(taskFile(token), { force: true });
        Object.assign(exec, { status: 'ABORTED', error: error ?? null, cause: cause ?? null, stopDate: nowIso(), cursor: null });
        emit(exec, 'ExecutionAborted', { ...(error ? { error } : {}), ...(cause ? { cause } : {}) });
        saveExecution(exec);
        return { stopDate: exec.stopDate };
      });
    },

    async getActivityTask({ activityArn, workerName }) {
      await reconcile();
      const activityName = nameFromArn(activityArn, 'activity');
      if (!activities.has(activityName)) throw new ServiceError('ActivityDoesNotExist', `Activity does not exist: ${activityArn}`);
      const ready = listTasks().filter((task) => task.activityName === activityName && !task.startedAt && (!task.notBefore || task.notBefore <= nowIso()));
      for (const candidate of ready) {
        let claimed = null;
        await skipBusy(() =>
          withExecutionLock(candidate.executionName, async () => {
            if (!fs.existsSync(taskFile(candidate.taskToken))) return;
            const task = readJson(taskFile(candidate.taskToken));
            const exec = loadExecution(task.executionName);
            if (task.startedAt || exec.cursor?.pendingTaskToken !== task.taskToken) return;
            Object.assign(task, { startedAt: nowIso(), workerName: workerName ?? null });
            writeJson(taskFile(task.taskToken), task);
            emit(exec, 'ActivityStarted', workerName ? { workerName } : undefined);
            saveExecution(exec);
            claimed = task;
          }),
        );
        if (claimed) return { taskToken: claimed.taskToken, input: toJson(claimed.input) };
      }
      return {};
    },

    async sendTaskSuccess({ taskToken, output }) {
      await reconcile();
      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch {
        throw new ServiceError('InvalidOutput', 'Task output is not valid JSON');
      }
      return completeTask(taskToken, (exec, state) => {
        emit(exec, 'ActivitySucceeded', { output: toJson(parsed) });
        finishTask(exec, state, parsed);
      });
    },

    async sendTaskFailure({ taskToken, error, cause }) {
      await reconcile();
      const failure = { error: error || 'States.TaskFailed', cause: cause ?? '' };
      return completeTask(taskToken, (exec, state) => {
        emit(exec, 'ActivityFailed', failure);
        handleTaskError(exec, state, failure);
      });
    },

    async listActivities() {
      return { activities: [...activities.values()].map((activity) => ({ activityArn: activity.arn, name: activity.name })) };
    },

    /** Local-only: every pending activity task, including its decoded input. */
    async listActivityTasks() {
      await reconcile();
      return {
        tasks: listTasks().map((task) => ({
          taskToken: task.taskToken,
          activityArn: task.activityArn,
          executionArn: task.executionArn,
          stateName: task.stateName,
          scheduledAt: task.scheduledAt,
          startedAt: task.startedAt,
          timeoutAt: task.timeoutAt,
          input: task.input,
        })),
      };
    },
  };

  const internalApi = {
    listExecutions: (options) => listExecutionsRaw(options),
    describeExecution: (executionArn) => describe(loadExecution(nameFromArn(executionArn, 'execution'))),
  };

  return api;
}

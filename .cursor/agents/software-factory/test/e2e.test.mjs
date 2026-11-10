import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { before, test } from 'node:test';
import { FACTORY_DIR } from '../runtime/factory.mjs';

const GIT_IDENTITY = ['-c', 'user.name=Factory Test', '-c', 'user.email=factory@example.com', '-c', 'commit.gpgsign=false'];
const STAGES = ['01-service-discovery', '02-graph-extraction', '03-architecture', '04-data-model', '05-integrations', '06-business-logic', '07-ux-flows'];

let repo;
let cliPath;
let storeRoot;
const env = { ...process.env };
delete env.FACTORY_REPO_ROOT;

function git(...args) {
  const result = spawnSync('git', [...GIT_IDENTITY, ...args], { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

before(() => {
  repo = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'factory-e2e-')));
  const installed = path.join(repo, '.cursor', 'agents', 'software-factory');
  fs.mkdirSync(path.dirname(installed), { recursive: true });
  fs.cpSync(FACTORY_DIR, installed, { recursive: true, filter: (source) => path.basename(source) !== 'factory.local.json' });
  fs.writeFileSync(
    path.join(installed, 'factory.local.json'),
    JSON.stringify({ context: ['README.md'], codeRoots: ['src/'], verify: { command: 'node check.mjs' } }),
  );
  fs.writeFileSync(path.join(repo, 'README.md'), '# Demo repo\n');
  fs.writeFileSync(path.join(repo, 'check.mjs'), "import fs from 'node:fs';\nprocess.exit(fs.readFileSync('src/feature.txt', 'utf8').trim() === 'ok' ? 0 : 1);\n");
  fs.mkdirSync(path.join(repo, 'legacy'));
  fs.writeFileSync(path.join(repo, 'legacy', 'index.js'), 'export const total = (items) => items.reduce((sum, item) => sum + item.price, 0);\n');
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'init');
  cliPath = path.join(installed, 'bin', 'factory.mjs');
  storeRoot = path.join(repo, 'factory', 'artifacts');
});

function cli(...args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], { cwd: path.join(repo, 'legacy'), env, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function ok(...args) {
  const result = cli(...args);
  assert.equal(result.status, 0, `${args[0]} exited ${result.status}: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

const start = (name, input) => ok('start-execution', '--name', name, '--input', JSON.stringify(input)).local;
const describe = (name) => ok('describe-execution', '--execution-arn', name);
const errorMessage = (cause) => JSON.parse(cause).errorMessage;

function claim(activity) {
  const task = ok('get-activity-task', '--activity-arn', activity, '--worker-name', 'test-worker');
  assert.ok(task.taskToken, `no ${activity} task is pending`);
  return { token: task.taskToken, brief: JSON.parse(task.input) };
}

const succeed = (token, output = {}) => ok('send-task-success', '--task-token', token, '--task-output', JSON.stringify(output)).local;

function put(brief, key, text) {
  const file = path.join(repo, brief.storeRoot, key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

const readStore = (key) => fs.readFileSync(path.join(storeRoot, key), 'utf8');
const manifest = (slug) => JSON.parse(readStore(`products/${slug}/manifest.json`));

const prd = (title, storyIds) => `---
title: ${title}
---

# ${title}

## Project requirements

Sell hats online.

## Design

One catalog page.

## Market sizing

Not applicable: test fixture.

## Scope estimation

Small.

## Architecture

Static pages.

## User stories

${storyIds.map((id) => `### ${id}: Story ${id}\n\nAs a shopper, I want ${id}, so that I can buy.\n\nPhase: 1\n\nAcceptance criteria:\n\n- ${id} works\n`).join('\n')}
## Open questions

- None
`;

const stageReport = (evidence) => `# Stage

## Findings

The cart sums item prices.

## Evidence

- \`${evidence}\` — cart total

## Open questions

- None
`;

test('a copied install validates and speaks the aws stepfunctions CLI', () => {
  assert.deepEqual(ok('validate-state-machine-definition'), { result: 'OK', diagnostics: [] });
  assert.equal(ok('list-activities').activities.length, 7);

  const missing = cli('describe-execution', '--execution-arn', 'missing');
  assert.equal(missing.status, 254);
  assert.match(missing.stderr, /An error occurred \(ExecutionDoesNotExist\) when calling the DescribeExecution operation/);
  assert.equal(cli('describe-execution').status, 252);
  assert.equal(cli('launch-rockets').status, 252);
});

test('forward: author, reject, review, refine, lock, prototype, implement, verify', () => {
  const name = 'shop-1';
  let local = start(name, { mode: 'forward', slug: 'shop', feature: 'A shop that sells hats' });
  assert.equal(local.waitingOn.stateName, 'AuthorPrd');

  let { token, brief } = claim('PrdAuthor');
  assert.equal(brief.guide, '.cursor/agents/software-factory/workers/prd-author.md');
  assert.ok(fs.existsSync(path.join(repo, brief.guide)));
  assert.ok(fs.existsSync(path.join(repo, brief.template)));
  assert.deepEqual(brief.context, ['README.md']);
  assert.equal(brief.validationFeedback, null);
  put(brief, brief.outputKey, '# Hats\n');
  assert.equal(succeed(token).waitingOn.stateName, 'AuthorPrd');

  ({ token, brief } = claim('PrdAuthor'));
  assert.equal(brief.validationFeedback.Error, 'Factory.ProposalInvalid');
  assert.match(errorMessage(brief.validationFeedback.Cause), /Missing section "## Project requirements"/);
  put(brief, brief.outputKey, prd('Hat shop', ['US-001']));
  assert.equal(succeed(token).waitingOn.stateName, 'ReviewPrd');
  assert.equal(fs.existsSync(path.join(storeRoot, brief.outputKey)), false);

  ({ token, brief } = claim('HumanReview'));
  assert.equal(brief.prdVersion, '1.0');
  assert.match(readStore(brief.prdKey), /^version: 1\.0$/m);
  assert.equal(succeed(token, { decision: 'revise', reviewer: 'Angel', prdVersion: '1.0', feedback: 'Add a wishlist' }).waitingOn.stateName, 'RefinePrd');

  ({ token, brief } = claim('PrdRefine'));
  assert.equal(brief.reviewFeedback, 'Add a wishlist');
  put(brief, brief.outputKey, prd('Hat shop', ['US-001', 'US-002']));
  assert.equal(succeed(token).waitingOn.stateName, 'ReviewPrd');

  ({ token, brief } = claim('HumanReview'));
  assert.equal(brief.prdVersion, '1.1');
  assert.equal(brief.round, 1);
  assert.equal(succeed(token, { decision: 'approve', reviewer: 'Angel', prdVersion: '1.0' }).waitingOn.stateName, 'ReviewPrd');

  ({ token, brief } = claim('HumanReview'));
  assert.match(errorMessage(brief.validationFeedback.Cause), /prdVersion must be "1\.1"/);
  assert.equal(succeed(token, { decision: 'approve', reviewer: 'Angel', prdVersion: '1.1' }).waitingOn.stateName, 'BuildPrototype');
  assert.equal(manifest('shop').prd.flowLocked, true);

  ({ token, brief } = claim('Prototype'));
  put(brief, `${brief.outputPrefix}index.html`, '<h1>Hats</h1>\n');
  put(
    brief,
    `${brief.outputPrefix}prototype.json`,
    JSON.stringify({ builtFromPrdVersion: '1.1', entry: 'index.html', screens: [{ id: 'home', file: 'index.html', stories: ['US-001', 'US-002'] }] }),
  );
  assert.equal(succeed(token).waitingOn.stateName, 'Implement');

  ({ token, brief } = claim('Implement'));
  assert.deepEqual(brief.codeRoots, ['src/']);
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'feature.txt'), 'broken\n');
  fs.writeFileSync(path.join(repo, 'stray.txt'), 'outside codeRoots\n');
  put(brief, brief.reportKey, JSON.stringify({ builtFromPrdVersion: '1.1', changedFiles: ['src/feature.txt'] }));
  assert.equal(succeed(token).waitingOn.stateName, 'Implement');

  ({ token, brief } = claim('Implement'));
  assert.match(errorMessage(brief.validationFeedback.Cause), /revert them: stray\.txt/);
  fs.rmSync(path.join(repo, 'stray.txt'));
  assert.equal(succeed(token).waitingOn.stateName, 'Implement');

  ({ token, brief } = claim('Implement'));
  assert.equal(brief.validationFeedback.Error, 'Factory.VerifyFailed');
  assert.match(errorMessage(brief.validationFeedback.Cause), /Verify failed \(exit 1\)/);
  fs.writeFileSync(path.join(repo, 'src', 'feature.txt'), 'ok\n');
  assert.equal(succeed(token).status, 'SUCCEEDED');

  const output = JSON.parse(describe(name).output);
  assert.equal(output.verify.status, 'passed');
  assert.equal(output.prd.version, '1.1');

  const shop = manifest('shop');
  assert.equal(shop.prd.current, '1.1');
  assert.equal(shop.prd.status, 'accepted');
  assert.equal(shop.prd.approvedBy, 'Angel');
  assert.deepEqual(shop.prd.versions.map((v) => [v.version, v.source]), [['1.0', 'author'], ['1.1', 'refine']]);
  assert.equal(shop.prototype.builtFrom, '1.1');
  assert.equal(shop.implementation.verified, true);
  assert.match(readStore('products/shop/prd/v1.1.md'), /^supersedes: 1\.0$/m);
  for (const key of [`prototype/${name}/index.html`, `implementation/${name}.json`, `implementation/${name}.verify.log`, `runs/${name}.json`]) {
    assert.ok(fs.existsSync(path.join(storeRoot, 'products/shop', key)), key);
  }

  const { events } = ok('get-execution-history', '--execution-arn', name);
  assert.equal(events[0].type, 'ExecutionStarted');
  assert.equal(events.at(-1).type, 'ExecutionSucceeded');
  assert.equal(ok('get-execution-history', '--execution-arn', name, '--reverse-order').events[0].type, 'ExecutionSucceeded');
});

test('refine: the round limit fails the run, and a later refine approves', () => {
  start('shop-refine-1', { mode: 'refine', slug: 'shop', scope: 'prd', maxRefineRounds: 0 });
  let { token, brief } = claim('HumanReview');
  assert.equal(brief.prdVersion, '1.1');
  assert.equal(brief.maxRounds, 0);
  assert.equal(succeed(token, { decision: 'revise', reviewer: 'Angel', prdVersion: '1.1', feedback: 'More' }).status, 'FAILED');
  assert.equal(describe('shop-refine-1').error, 'Factory.RefineLimitExceeded');

  start('shop-refine-2', { mode: 'refine', slug: 'shop', scope: 'prd' });
  ({ token, brief } = claim('HumanReview'));
  assert.equal(succeed(token, { decision: 'approve', reviewer: 'Sam', prdVersion: '1.1' }).status, 'SUCCEEDED');
  const output = JSON.parse(describe('shop-refine-2').output);
  assert.equal(output.prototype.key, null);
  assert.equal(output.verify.status, 'not-run');
  assert.equal(manifest('shop').prd.approvedBy, 'Sam');
});

test('input is validated, and each product runs one execution at a time', () => {
  assert.equal(start('bad-1', { mode: 'sideways', slug: 'Bad Slug' }).status, 'FAILED');
  const bad = describe('bad-1');
  assert.equal(bad.error, 'Factory.InvalidInput');
  assert.match(errorMessage(bad.cause), /mode must be one of/);
  assert.match(errorMessage(bad.cause), /slug must be lowercase kebab-case/);

  assert.equal(start('refine-missing', { mode: 'refine', slug: 'nothing' }).status, 'FAILED');
  assert.match(errorMessage(describe('refine-missing').cause), /needs a committed PRD/);

  assert.equal(start('hats-a', { mode: 'forward', slug: 'hats', feature: 'Hats' }).waitingOn.stateName, 'AuthorPrd');
  assert.equal(start('hats-b', { mode: 'forward', slug: 'hats', feature: 'Hats' }).status, 'FAILED');
  assert.equal(describe('hats-b').error, 'Factory.ProductBusy');

  ok('stop-execution', '--execution-arn', 'hats-a');
  assert.equal(describe('hats-a').status, 'ABORTED');
  assert.deepEqual(ok('list-activity-tasks').tasks, []);
  assert.deepEqual(ok('list-executions', '--status-filter', 'RUNNING').executions, []);
});

test('a worker that keeps failing validation hits the rejection limit', () => {
  start('limit-1', { mode: 'forward', slug: 'limits', feature: 'Anything', scope: 'prd' });
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const { token, brief } = claim('PrdAuthor');
    put(brief, brief.outputKey, '# Still wrong\n');
    const local = succeed(token);
    assert.equal(local.status, attempt <= 3 ? 'RUNNING' : 'FAILED');
  }
  assert.equal(describe('limit-1').error, 'Factory.RejectionLimitExceeded');
});

test('reverse: seven grounded stages, synthesis, review, commit', () => {
  const name = 'legacy-1';
  let local = start(name, { mode: 'reverse', slug: 'legacy', repo: 'legacy', scope: 'prd' });
  assert.equal(local.waitingOn.stateName, 'DiscoverServices');

  let { token, brief } = claim('ReverseAnalysis');
  assert.equal(brief.repo, 'legacy');
  put(brief, brief.outputKey, stageReport('missing.js'));
  assert.equal(succeed(token).waitingOn.stateName, 'DiscoverServices');

  const stages = [];
  while (local.waitingOn?.stateName !== 'SynthesizePrd') {
    ({ token, brief } = claim('ReverseAnalysis'));
    stages.push(brief.stage);
    put(brief, brief.outputKey, stageReport('index.js:1'));
    local = succeed(token);
  }
  assert.deepEqual(stages, STAGES);

  ({ token, brief } = claim('PrdSynthesis'));
  assert.equal(brief.stage, '08-prd-synthesis');
  put(brief, brief.outputKey, prd('Legacy cart', ['US-001']));
  assert.equal(succeed(token).waitingOn.stateName, 'ReviewPrd');

  ({ token, brief } = claim('HumanReview'));
  assert.equal(succeed(token, { decision: 'approve', reviewer: 'Angel', prdVersion: '1.0' }).status, 'SUCCEEDED');

  assert.deepEqual(manifest('legacy').prd.versions.map((v) => v.source), ['synthesis']);
  const output = JSON.parse(describe(name).output);
  assert.equal(output.analysisKey, `products/legacy/analysis/${name}/`);
  for (const stage of STAGES) assert.ok(fs.existsSync(path.join(storeRoot, output.analysisKey, `${stage}.md`)), stage);
});

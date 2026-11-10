import fs from 'node:fs';
import path from 'node:path';
import { FactoryError, bulletList } from './lib/errors.mjs';
import { dirtyFiles } from './lib/paths.mjs';
import { readManifest } from './lib/product.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MODES = ['forward', 'reverse', 'refine'];
const SCOPES = ['prd', 'prototype', 'full'];

const isText = (value) => typeof value === 'string' && value.trim() !== '';

/** Validates execution input and builds the `run` record every later state reads and returns. */
export async function handler(event, context) {
  const { store, config, repoRoot, factoryDir, states } = context.factory;
  const { input, executionName } = event;
  const scope = input.scope ?? 'full';
  const extraContext = input.context ?? [];
  const maxRounds = input.maxRefineRounds ?? config.limits.maxRefineRounds;

  const problems = [];
  if (!MODES.includes(input.mode)) problems.push(`mode must be one of: ${MODES.join(', ')}`);
  if (!SCOPES.includes(scope)) problems.push(`scope must be one of: ${SCOPES.join(', ')}`);
  if (typeof input.slug !== 'string' || !SLUG.test(input.slug)) problems.push('slug must be lowercase kebab-case, for example "subscription-tracker"');
  if (input.mode === 'forward' && !isText(input.feature)) problems.push('forward mode needs "feature": the plain-language description');
  if (input.mode === 'reverse') {
    const repo = isText(input.repo) ? path.resolve(repoRoot, input.repo) : null;
    if (!repo || !fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) problems.push('reverse mode needs "repo": a directory relative to the repository root');
  }
  if (!Array.isArray(extraContext) || !extraContext.every(isText)) problems.push('context must be a list of repo-relative paths');
  if (!Number.isInteger(maxRounds) || maxRounds < 0) problems.push('maxRefineRounds must be a non-negative integer');

  const contextDocs = [...new Set([...config.context, ...(Array.isArray(extraContext) ? extraContext.filter(isText) : [])])];
  for (const doc of contextDocs) if (!fs.existsSync(path.resolve(repoRoot, doc))) problems.push(`context path does not exist: ${doc}`);

  const manifest = SLUG.test(input.slug ?? '') ? await readManifest(store, input.slug) : null;
  const current = manifest?.prd.versions.find((version) => version.version === manifest.prd.current) ?? null;
  if (input.mode === 'refine' && !current) problems.push(`refine mode needs a committed PRD for "${input.slug}"; run forward or reverse first`);
  if (problems.length > 0) throw new FactoryError('Factory.InvalidInput', bulletList(problems));

  for (const other of states.listExecutions({ statusFilter: 'RUNNING' })) {
    if (other.name === executionName) continue;
    if (JSON.parse(states.describeExecution(other.executionArn).input).slug === input.slug) {
      throw new FactoryError('Factory.ProductBusy', `Execution ${other.name} is already running for "${input.slug}". Finish or stop it first.`);
    }
  }

  const staging = `staging/${executionName}/`;
  await store.putJson(`${staging}baseline.json`, { dirtyFiles: dirtyFiles(repoRoot) });

  return {
    executionName,
    slug: input.slug,
    mode: input.mode,
    scope,
    feature: input.mode === 'forward' ? input.feature.trim() : null,
    repo: input.mode === 'reverse' ? path.relative(repoRoot, path.resolve(repoRoot, input.repo)).split(path.sep).join('/') || '.' : null,
    context: contextDocs,
    storeRoot: config.artifactRoot,
    factoryDir,
    staging,
    templates: config.templates,
    codeRoots: config.codeRoots,
    prd: { version: current?.version ?? null, key: current?.key ?? null, status: manifest?.prd.status ?? null },
    review: { decision: null, reviewer: null, feedback: null, round: 0, maxRounds },
    prototype: { key: null },
    implementation: { reportKey: null },
    verify: { configured: isText(config.verify.command), status: 'pending', logKey: null },
    analysisKey: null,
    feedback: null,
  };
}

import fs from 'node:fs';
import path from 'node:path';
import { FactoryError } from './lib/errors.mjs';
import { dirtyFiles, isWithin, normalizeRepoPath } from './lib/paths.mjs';
import { readManifest, rejectProposal } from './lib/product.mjs';

/** Checks the implementation report and that every file the worker touched stays inside codeRoots. */
export async function handler(event, context) {
  const { store, config, repoRoot } = context.factory;
  const { run } = event;
  const manifest = await readManifest(store, run.slug);
  if (!manifest?.prd.flowLocked || manifest.prd.current !== run.prd.version) {
    throw new FactoryError('Factory.InvalidState', `Implementation needs PRD v${run.prd.version} accepted and flow-locked`);
  }

  const reportKey = `${run.staging}implementation.json`;
  const problems = [];
  let report = null;
  if (!(await store.exists(reportKey))) {
    problems.push(`No implementation report at ${run.storeRoot}/${reportKey}`);
  } else {
    try {
      report = await store.getJson(reportKey);
    } catch {
      problems.push('implementation.json is not valid JSON');
    }
  }

  const current = dirtyFiles(repoRoot);
  if (report) {
    if (report.builtFromPrdVersion !== run.prd.version) problems.push(`builtFromPrdVersion must be "${run.prd.version}"`);
    if (!Array.isArray(report.changedFiles) || report.changedFiles.length === 0) {
      problems.push('changedFiles must list every file you created, edited, or deleted');
    } else {
      for (const listed of report.changedFiles) {
        const file = normalizeRepoPath(listed);
        if (file === null) problems.push(`changedFiles entry "${listed}" must be a repo-relative path`);
        else if (!isWithin(file, run.codeRoots)) problems.push(`${file} is outside codeRoots (${run.codeRoots.join(', ')})`);
        else if (current ? !current.includes(file) : !fs.existsSync(path.resolve(repoRoot, file))) problems.push(`${file} is listed but has no change`);
      }
    }
  }

  const { dirtyFiles: baseline } = await store.getJson(`${run.staging}baseline.json`);
  if (current && baseline) {
    const allowed = [...run.codeRoots, config.artifactRoot, config.executionRoot];
    const stray = current.filter((file) => !baseline.includes(file) && !isWithin(file, allowed));
    if (stray.length > 0) problems.push(`Files changed outside codeRoots since the run started; revert them: ${stray.join(', ')}`);
  }

  if (problems.length > 0) await rejectProposal(store, run, 'implement', config.limits.maxRejections, problems);
  return { ...run, feedback: null, implementation: { reportKey } };
}

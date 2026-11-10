import fs from 'node:fs';
import path from 'node:path';
import { headings, normalizeHeading, sectionBody, splitFrontMatter } from './lib/markdown.mjs';
import { readRepoFile, rejectProposal } from './lib/product.mjs';

/** Checks one reverse-analysis stage report: template sections present and evidence grounded in real files. */
export async function handler(event, context) {
  const { store, config, repoRoot } = context.factory;
  const { run, stage } = event;
  const key = `${run.staging}analysis/${stage}.md`;

  const problems = [];
  if (!(await store.exists(key))) {
    problems.push(`No stage report at ${run.storeRoot}/${key}`);
  } else {
    const text = await store.getText(key);
    const template = splitFrontMatter(readRepoFile(repoRoot, run.templates.analysisStage)).body;
    const present = new Set(headings(text, 2).map(normalizeHeading));
    for (const required of headings(template, 2)) {
      if (!present.has(normalizeHeading(required))) problems.push(`Missing section "## ${required}"`);
    }
    if (text.includes('{{')) problems.push('Template placeholders ({{...}}) are still present');

    const cited = [...sectionBody(text, 'Evidence').matchAll(/`([^`\s]+)`/g)].map((match) => match[1].replace(/:\d+(?:-\d+)?$/, ''));
    const grounded = cited.filter((file) => fs.existsSync(path.resolve(repoRoot, run.repo, file)) || fs.existsSync(path.resolve(repoRoot, file)));
    if (grounded.length === 0) problems.push(`"## Evidence" must cite at least one existing file in backticks, relative to ${run.repo}`);
  }
  if (problems.length > 0) await rejectProposal(store, run, stage, config.limits.maxRejections, problems);
  return { ...run, feedback: null };
}

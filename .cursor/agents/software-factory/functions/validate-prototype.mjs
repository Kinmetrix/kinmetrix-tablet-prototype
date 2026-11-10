import { parseStories, splitFrontMatter } from './lib/markdown.mjs';
import { normalizeRepoPath } from './lib/paths.mjs';
import { rejectProposal } from './lib/product.mjs';

/** Checks the staged prototype: its manifest, its files, and that every screen traces to stories in the locked PRD. */
export async function handler(event, context) {
  const { store, config } = context.factory;
  const { run } = event;
  const prefix = `${run.staging}prototype/`;
  const manifestKey = `${prefix}prototype.json`;
  const fileExists = async (file) => {
    const normalized = normalizeRepoPath(file);
    return normalized !== null && normalized !== '.' && store.exists(`${prefix}${normalized}`);
  };

  const problems = [];
  let manifest = null;
  if (!(await store.exists(manifestKey))) {
    problems.push(`No prototype manifest at ${run.storeRoot}/${manifestKey}`);
  } else {
    try {
      manifest = await store.getJson(manifestKey);
    } catch {
      problems.push('prototype.json is not valid JSON');
    }
  }

  if (manifest) {
    const storyIds = new Set(parseStories(splitFrontMatter(await store.getText(run.prd.key)).body).map((story) => story.id));
    if (manifest.builtFromPrdVersion !== run.prd.version) problems.push(`builtFromPrdVersion must be "${run.prd.version}"`);
    if (!(await fileExists(manifest.entry))) problems.push('entry must name an HTML file inside the prototype folder');
    if (!Array.isArray(manifest.screens) || manifest.screens.length === 0) {
      problems.push('screens must list at least one screen');
    } else {
      for (const [index, screen] of manifest.screens.entries()) {
        const label = typeof screen?.id === 'string' && screen.id ? screen.id : `screens[${index}]`;
        if (label === `screens[${index}]`) problems.push(`${label} needs an id`);
        if (!(await fileExists(screen?.file))) problems.push(`${label}: file "${screen?.file}" is not in the prototype folder`);
        if (!Array.isArray(screen?.stories) || screen.stories.length === 0) {
          problems.push(`${label}: stories must list the user stories this screen shows`);
        } else {
          for (const id of screen.stories) if (!storyIds.has(id)) problems.push(`${label}: story ${id} is not in PRD v${run.prd.version}`);
        }
      }
    }
  }
  if (problems.length > 0) await rejectProposal(store, run, 'prototype', config.limits.maxRejections, problems);
  return { ...run, feedback: null };
}

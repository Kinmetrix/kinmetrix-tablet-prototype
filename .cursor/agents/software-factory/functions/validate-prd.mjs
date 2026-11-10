import { headings, normalizeHeading, parseStories, splitFrontMatter } from './lib/markdown.mjs';
import { readRepoFile, rejectProposal } from './lib/product.mjs';

export function checkPrd(text, templateText) {
  const problems = [];
  const { data, body } = splitFrontMatter(text);
  if (!data?.title) problems.push('The file must start with front matter that sets "title"');

  const present = new Set(headings(body, 2).map(normalizeHeading));
  for (const required of headings(splitFrontMatter(templateText).body, 2)) {
    if (!present.has(normalizeHeading(required))) problems.push(`Missing section "## ${required}"`);
  }
  if (text.includes('{{')) problems.push('Template placeholders ({{...}}) are still present');

  const stories = parseStories(body);
  if (stories.length === 0) problems.push('No user stories found; use "### US-001: Title" headings');
  const seen = new Set();
  for (const story of stories) {
    if (seen.has(story.id)) problems.push(`Duplicate story id ${story.id}`);
    seen.add(story.id);
    if (story.acceptanceCriteria.length === 0) problems.push(`${story.id} needs an "Acceptance criteria:" line followed by "- " bullets`);
  }
  return problems;
}

/** Checks the staged PRD proposal against the configured PRD template. */
export async function handler(event, context) {
  const { store, config, repoRoot } = context.factory;
  const { run, role } = event;
  const key = `${run.staging}prd.md`;
  const problems = (await store.exists(key))
    ? checkPrd(await store.getText(key), readRepoFile(repoRoot, run.templates.prd))
    : [`No proposal at ${run.storeRoot}/${key}`];
  if (problems.length > 0) await rejectProposal(store, run, role, config.limits.maxRejections, problems);
  return { ...run, feedback: null };
}

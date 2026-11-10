import { FactoryError } from './lib/errors.mjs';
import { joinFrontMatter, splitFrontMatter } from './lib/markdown.mjs';
import { emptyManifest, productPrefix, readManifest, writeManifest } from './lib/product.mjs';

const bumpMinor = (version) => {
  const [major, minor] = version.split('.').map(Number);
  return `${major}.${minor + 1}`;
};
const bumpMajor = (version) => `${Number(version.split('.')[0]) + 1}.0`;

/** Commits the validated staging PRD as a new immutable version and marks it for review. */
export async function handler(event, context) {
  const { store } = context.factory;
  const { run, source } = event;
  const manifest = (await readManifest(store, run.slug)) ?? emptyManifest(run.slug);
  const previous = manifest.prd.current;
  if (source === 'refine' && !previous) throw new FactoryError('Factory.InvalidState', 'Cannot commit a refinement: no PRD is committed yet');

  const version = !previous ? '1.0' : source === 'refine' ? bumpMinor(previous) : bumpMajor(previous);
  const key = `${productPrefix(run.slug)}prd/v${version}.md`;
  if (await store.exists(key)) throw new FactoryError('Factory.VersionExists', `${key} already exists; committed versions are immutable`);

  const stagingKey = `${run.staging}prd.md`;
  const { data, body } = splitFrontMatter(await store.getText(stagingKey));
  const committedAt = new Date().toISOString();
  const header = { title: data.title, slug: run.slug, version, source, supersedes: previous ?? 'none', execution: run.executionName, committedAt };
  await store.putText(key, joinFrontMatter(header, body));
  await store.delete(stagingKey);

  manifest.prd = {
    ...manifest.prd,
    current: version,
    status: 'review',
    flowLocked: false,
    approvedBy: null,
    approvedAt: null,
    versions: [...manifest.prd.versions, { version, key, source, execution: run.executionName, committedAt }],
  };
  await writeManifest(store, manifest);
  return { ...run, prd: { version, key, status: 'review' } };
}

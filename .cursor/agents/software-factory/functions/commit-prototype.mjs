import { emptyManifest, productPrefix, readManifest, writeManifest } from './lib/product.mjs';

/** Commits the validated prototype under the product and records which PRD version it was built from. */
export async function handler(event, context) {
  const { store } = context.factory;
  const { run } = event;
  const staged = `${run.staging}prototype/`;
  const key = `${productPrefix(run.slug)}prototype/${run.executionName}/`;
  const { entry } = await store.getJson(`${staged}prototype.json`);
  await store.copyPrefix(staged, key);

  const manifest = (await readManifest(store, run.slug)) ?? emptyManifest(run.slug);
  manifest.prototype = { builtFrom: run.prd.version, key, entry, execution: run.executionName };
  await writeManifest(store, manifest);
  return { ...run, prototype: { key } };
}

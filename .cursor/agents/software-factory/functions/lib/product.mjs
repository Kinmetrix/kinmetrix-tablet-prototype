import fs from 'node:fs';
import path from 'node:path';
import { FactoryError, bulletList } from './errors.mjs';

export const productPrefix = (slug) => `products/${slug}/`;
const manifestKey = (slug) => `${productPrefix(slug)}manifest.json`;

export const emptyManifest = (slug) => ({
  slug,
  prd: { current: null, status: null, flowLocked: false, approvedBy: null, approvedAt: null, versions: [] },
  prototype: null,
  implementation: null,
  lastRun: null,
});

export async function readManifest(store, slug) {
  const key = manifestKey(slug);
  return (await store.exists(key)) ? store.getJson(key) : null;
}

export async function writeManifest(store, manifest) {
  await store.putJson(manifestKey(manifest.slug), manifest);
}

export function readRepoFile(repoRoot, file) {
  const resolved = path.resolve(repoRoot, file);
  if (!fs.existsSync(resolved)) throw new FactoryError('Factory.ConfigInvalid', `File not found: ${file}`);
  return fs.readFileSync(resolved, 'utf8');
}

/**
 * Rejects a worker proposal. Counts rejections per counter in the run's staging area and
 * throws `Factory.RejectionLimitExceeded` once the count passes `limit`, so feedback loops stay bounded.
 */
export async function rejectProposal(store, run, counter, limit, problems, errorName = 'Factory.ProposalInvalid') {
  const key = `${run.staging}rejections.json`;
  const counts = (await store.exists(key)) ? await store.getJson(key) : {};
  counts[counter] = (counts[counter] ?? 0) + 1;
  await store.putJson(key, counts);
  const details = bulletList(problems);
  if (counts[counter] > limit) {
    throw new FactoryError('Factory.RejectionLimitExceeded', `${counter} was rejected ${counts[counter]} times (limit ${limit}). Last problems:\n${details}`);
  }
  throw new FactoryError(errorName, details);
}

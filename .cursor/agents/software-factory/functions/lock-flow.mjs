import { FactoryError } from './lib/errors.mjs';
import { readManifest, writeManifest } from './lib/product.mjs';

/** Marks the approved PRD version accepted and flow-locked; prototype and code build only from a locked version. */
export async function handler(event, context) {
  const { store } = context.factory;
  const { run } = event;
  const manifest = await readManifest(store, run.slug);
  if (!manifest || manifest.prd.current !== run.prd.version) {
    throw new FactoryError('Factory.InvalidState', `Manifest is at v${manifest?.prd.current}, but v${run.prd.version} was approved`);
  }
  if (run.review.decision !== 'approve') throw new FactoryError('Factory.InvalidState', 'LockFlow requires an approved review');

  manifest.prd = { ...manifest.prd, status: 'accepted', flowLocked: true, approvedBy: run.review.reviewer, approvedAt: new Date().toISOString() };
  await writeManifest(store, manifest);
  return { ...run, prd: { ...run.prd, status: 'accepted' } };
}

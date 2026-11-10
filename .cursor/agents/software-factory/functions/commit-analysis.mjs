import { FactoryError } from './lib/errors.mjs';
import { productPrefix } from './lib/product.mjs';

/** Commits the validated reverse-analysis stage reports under the product. */
export async function handler(event, context) {
  const { store } = context.factory;
  const { run } = event;
  const analysisKey = `${productPrefix(run.slug)}analysis/${run.executionName}/`;
  const copied = await store.copyPrefix(`${run.staging}analysis/`, analysisKey);
  if (copied === 0) throw new FactoryError('Factory.InvalidState', 'No analysis stage reports to commit');
  return { ...run, analysisKey };
}

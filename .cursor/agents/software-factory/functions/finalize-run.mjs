import { emptyManifest, productPrefix, readManifest, writeManifest } from './lib/product.mjs';

/** Records the run under the product and promotes the implementation report and verify log. */
export async function handler(event, context) {
  const { store } = context.factory;
  const { run } = event;
  const prefix = productPrefix(run.slug);
  const manifest = (await readManifest(store, run.slug)) ?? emptyManifest(run.slug);
  const verifyStatus = run.verify.status === 'pending' ? (run.verify.configured ? 'not-run' : 'not-configured') : run.verify.status;

  if (run.implementation.reportKey) {
    const reportKey = `${prefix}implementation/${run.executionName}.json`;
    await store.putText(reportKey, await store.getText(run.implementation.reportKey));
    let verifyLogKey = null;
    if (run.verify.logKey) {
      verifyLogKey = `${prefix}implementation/${run.executionName}.verify.log`;
      await store.putText(verifyLogKey, await store.getText(run.verify.logKey));
    }
    manifest.implementation = { builtFrom: run.prd.version, reportKey, verified: verifyStatus === 'passed', verifyLogKey, execution: run.executionName };
  }

  const finishedAt = new Date().toISOString();
  await store.putJson(`${prefix}runs/${run.executionName}.json`, {
    execution: run.executionName,
    mode: run.mode,
    scope: run.scope,
    prd: run.prd,
    analysis: run.analysisKey,
    prototype: run.prototype.key,
    implementation: run.implementation.reportKey ? manifest.implementation : null,
    verify: verifyStatus,
    finishedAt,
  });
  manifest.lastRun = { execution: run.executionName, mode: run.mode, scope: run.scope, finishedAt };
  await writeManifest(store, manifest);
  return { ...run, verify: { ...run.verify, status: verifyStatus } };
}

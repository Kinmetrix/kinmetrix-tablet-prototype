import { spawnSync } from 'node:child_process';
import { FactoryError } from './lib/errors.mjs';
import { rejectProposal } from './lib/product.mjs';

/** Runs the configured verify command from the repo root; a failure sends its log back to the Implement worker. */
export async function handler(event, context) {
  const { store, config, repoRoot } = context.factory;
  const { run } = event;
  const { command, timeoutSeconds } = config.verify;
  if (typeof command !== 'string' || command.trim() === '') throw new FactoryError('Factory.InvalidState', 'verify.command is not configured');

  const started = Date.now();
  const result = spawnSync(command, {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutSeconds * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const timedOut = result.error?.code === 'ETIMEDOUT';
  const log = [
    `$ ${command}`,
    `exit: ${result.status ?? 'none'}${result.signal ? ` (signal ${result.signal})` : ''}${timedOut ? ` (timed out after ${timeoutSeconds}s)` : ''}`,
    `duration: ${Math.round((Date.now() - started) / 1000)}s`,
    '',
    result.stdout ?? '',
    result.stderr ?? '',
  ].join('\n');
  const logKey = `${run.staging}verify.log`;
  await store.putText(logKey, log);

  if (result.status === 0) return { ...run, feedback: null, verify: { ...run.verify, status: 'passed', logKey } };
  const tail = log.split('\n').slice(-40).join('\n');
  return rejectProposal(
    store,
    run,
    'implement',
    config.limits.maxRejections,
    [`Verify failed (${timedOut ? 'timeout' : `exit ${result.status}`}). Full log: ${run.storeRoot}/${logKey}\n${tail}`],
    'Factory.VerifyFailed',
  );
}

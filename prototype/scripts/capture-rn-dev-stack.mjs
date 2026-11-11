#!/usr/bin/env node
/**
 * Capture root-stack RN screens reachable from Login without auth.
 * Requires Kinmetrix IPad booted, agent-device, dev build (debug menu on version tap).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capture = path.join(prototypeRoot, 'scripts', 'capture-rn-screenshot.mjs');
const device = 'Kinmetrix IPad';
const bundle = 'com.timehero.Kinmetrix';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function snap(slug) {
  run(process.execPath, [capture, slug], { cwd: prototypeRoot });
}

function ad(...args) {
  run('agent-device', args);
}

try {
  run('agent-device', ['open', bundle, '--device', device, '--foreground', '--relaunch']);
  await sleep(3000);
} catch {
  console.warn('agent-device open failed (device in use?). Navigate to Login manually, then continuing.');
  await sleep(500);
}
snap('login');

ad('snapshot', '-i');
ad('find', 'Get Started', 'press');
await sleep(1200);
ad('wait', 'text', 'Log in to Kinmetrix');
snap('password-login');

ad('find', 'Back', 'press', '--first');
await sleep(800);
ad('snapshot', '-i');
ad('find', 'v1.5.0', 'press');
await sleep(600);
ad('snapshot', '-i');
ad('find', 'Settings', 'press', '--first');
await sleep(1200);
ad('wait', 'text', 'Use Dark Theme');
snap('settings');

ad('find', 'Back', 'press', '--first');
await sleep(800);
ad('snapshot', '-i');
ad('find', 'v1.5.0', 'press');
await sleep(600);
ad('snapshot', '-i');
ad('find', 'Debug Device', 'press');
await sleep(1200);
ad('wait', 'text', 'Connected Device');
snap('device-control');

console.log('Done. Verify PNGs with Read before trusting stitch.');

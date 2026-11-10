#!/usr/bin/env node
/**
 * Capture root-stack RN screens reachable from Login without auth.
 * Requires Kinmetrix IPad booted, agent-device, dev build (debug menu on logo tap).
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

run('agent-device', ['open', bundle, '--device', device, '--foreground', '--relaunch']);
await sleep(3000);
snap('login');

ad('press', '590', '780', '--settle');
await sleep(1200);
snap('password-login');

ad('press', '60', '50', '--settle');
await sleep(600);
ad('press', '590', '450', '--settle');
await sleep(400);
ad('press', '90', '180', '--settle');
await sleep(800);
snap('settings');

ad('press', '60', '50', '--settle');
await sleep(600);
ad('press', '590', '450', '--settle');
await sleep(400);
ad('press', '90', '260', '--settle');
await sleep(800);
snap('device-control');

console.log('Done. Verify PNGs; coords may need tuning per build.');

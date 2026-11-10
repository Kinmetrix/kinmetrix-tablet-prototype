#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { rotateRnLandscape } from './lib/rotate-rn-png.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/capture-rn-screenshot.mjs <slug>');
  process.exit(1);
}

const devicePath = path.join(prototypeRoot, 'visual-compare', 'device.json');
const device = JSON.parse(fs.readFileSync(devicePath, 'utf8'));
const outDir = path.join(prototypeRoot, 'visual-compare', 'rn');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${slug}.png`);

const tmp = out + '.raw.png';
execFileSync('xcrun', ['simctl', 'io', device.udid, 'screenshot', tmp], { stdio: 'inherit' });
fs.renameSync(tmp, out);
await rotateRnLandscape(out);
console.log(`RN screenshot (landscape): ${out}`);

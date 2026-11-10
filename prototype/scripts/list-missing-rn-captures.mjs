#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorScreens } from './lib/load-screens.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rnDir = path.join(prototypeRoot, 'visual-compare', 'rn');
const asJson = process.argv.includes('--json');

const seen = new Set();
const missing = [];
const have = [];

for (const screen of loadMirrorScreens(prototypeRoot)) {
  if (seen.has(screen.slug)) continue;
  seen.add(screen.slug);
  const png = path.join(rnDir, `${screen.slug}.png`);
  if (fs.existsSync(png)) have.push(screen);
  else missing.push(screen);
}

if (asJson) {
  console.log(JSON.stringify({ have: have.length, missing: missing.length, missingScreens: missing }, null, 2));
} else {
  console.log(`RN captures: ${have.length} done, ${missing.length} missing (mirror routes)`);
  for (const s of missing) {
    console.log(`- ${s.slug} (${s.route})`);
  }
}

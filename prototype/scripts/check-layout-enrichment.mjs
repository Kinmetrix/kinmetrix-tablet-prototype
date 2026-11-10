#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorManifest } from './lib/load-screens.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = loadMirrorManifest(prototypeRoot);

function isEnriched(htmlPath) {
  const text = fs.readFileSync(htmlPath, 'utf8');
  return /\bdata-enriched=["']true["']/.test(text);
}

const pending = [];
const enriched = [];

for (const screen of manifest.screens) {
  const file = path.join(prototypeRoot, screen.html);
  if (!fs.existsSync(file)) {
    pending.push({ ...screen, reason: 'missing-file' });
    continue;
  }
  if (isEnriched(file)) enriched.push(screen);
  else pending.push(screen);
}

const total = manifest.screens.length;
console.log(`layout-enrichment: ${enriched.length}/${total} enriched, ${pending.length} pending`);
if (pending.length > 0) {
  console.log('pending:', pending.map((s) => s.html).join(', '));
  process.exit(1);
}
process.exit(0);

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorScreens } from './lib/load-screens.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screens = loadMirrorScreens(prototypeRoot);
const missing = screens.filter((s) => !fs.existsSync(path.join(prototypeRoot, s.html)));
if (missing.length > 0) {
  console.error('Missing HTML:', missing.map((s) => s.html).join(', '));
  process.exit(1);
}
console.log(`OK ${screens.length} screens`);
process.exit(0);

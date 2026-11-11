#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { rotateRnLandscape } from './lib/rotate-rn-png.mjs';

const rnDir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'visual-compare', 'rn');
const files = fs.readdirSync(rnDir).filter((f) => f.endsWith('.png') && !f.startsWith('_'));

for (const f of files) {
  await rotateRnLandscape(path.join(rnDir, f));
  console.log('rotated', f);
}

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { loadMirrorScreens } from './lib/load-screens.mjs';
import { loadTabletViewport } from './lib/tablet-viewport.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rnDir = path.join(prototypeRoot, 'visual-compare', 'rn');
const htmlDir = path.join(prototypeRoot, 'visual-compare', 'html');
const pairsDir = path.join(prototypeRoot, 'visual-compare', 'pairs');
const { height: TARGET_HEIGHT } = loadTabletViewport();

const screens = loadMirrorScreens(prototypeRoot);

fs.mkdirSync(pairsDir, { recursive: true });

const seenSlug = new Set();
let stitched = 0;
let missingRn = [];
let missingHtml = [];

for (const screen of screens) {
  if (seenSlug.has(screen.slug)) continue;
  seenSlug.add(screen.slug);
  const rnPath = path.join(rnDir, `${screen.slug}.png`);
  const htmlPath = path.join(htmlDir, `${screen.slug}.png`);
  const outPath = path.join(pairsDir, `${screen.slug}.png`);

  if (!fs.existsSync(htmlPath)) {
    missingHtml.push(screen.slug);
    continue;
  }
  if (!fs.existsSync(rnPath)) {
    missingRn.push(screen.slug);
    continue;
  }

  const rn = sharp(rnPath);
  const html = sharp(htmlPath);
  const [rnMeta, htmlMeta] = await Promise.all([rn.metadata(), html.metadata()]);
  const height = Math.max(rnMeta.height || 0, htmlMeta.height || 0, TARGET_HEIGHT);

  const rnBuf = await rn.resize({ height, fit: 'contain', background: '#111' }).png().toBuffer();
  const htmlBuf = await html.resize({ height, fit: 'contain', background: '#e8e8ed' }).png().toBuffer();
  const rnW = (await sharp(rnBuf).metadata()).width;
  const htmlW = (await sharp(htmlBuf).metadata()).width;

  const composite = await sharp({
    create: {
      width: rnW + htmlW + 4,
      height,
      channels: 3,
      background: '#333',
    },
  })
    .composite([
      { input: rnBuf, left: 0, top: 0 },
      { input: htmlBuf, left: rnW + 4, top: 0 },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(outPath, composite);
  stitched += 1;
}

console.log(`Stitched ${stitched} pairs to ${pairsDir}`);
if (missingRn.length) console.log(`Missing RN (${missingRn.length}):`, missingRn.slice(0, 8).join(', '), missingRn.length > 8 ? '…' : '');
if (missingHtml.length) console.log(`Missing HTML (${missingHtml.length}):`, missingHtml.slice(0, 8).join(', '), missingHtml.length > 8 ? '…' : '');

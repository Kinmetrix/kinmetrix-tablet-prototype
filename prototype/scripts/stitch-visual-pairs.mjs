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
const device = JSON.parse(
  fs.readFileSync(path.join(prototypeRoot, 'visual-compare', 'device.json'), 'utf8')
);
const TILE_W = Number(device.pixelWidth) || loadTabletViewport().width * 2;
const TILE_H = Number(device.pixelHeight) || loadTabletViewport().height * 2;
const GAP = 4;

const screens = loadMirrorScreens(prototypeRoot);

fs.mkdirSync(pairsDir, { recursive: true });

const seenSlug = new Set();
let stitched = 0;
let missingRn = [];
let missingHtml = [];

async function toTile(inputPath, background) {
  return sharp(inputPath)
    .resize({
      width: TILE_W,
      height: TILE_H,
      fit: 'contain',
      background,
    })
    .png()
    .toBuffer();
}

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

  const [rnBuf, htmlBuf] = await Promise.all([
    toTile(rnPath, '#111'),
    toTile(htmlPath, '#e8e8ed'),
  ]);

  const composite = await sharp({
    create: {
      width: TILE_W * 2 + GAP,
      height: TILE_H,
      channels: 3,
      background: '#333',
    },
  })
    .composite([
      { input: rnBuf, left: 0, top: 0 },
      { input: htmlBuf, left: TILE_W + GAP, top: 0 },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(outPath, composite);
  stitched += 1;
}

console.log(`Stitched ${stitched} pairs (${TILE_W}×${TILE_H} tiles) to ${pairsDir}`);
if (missingRn.length) console.log(`Missing RN (${missingRn.length}):`, missingRn.slice(0, 8).join(', '), missingRn.length > 8 ? '…' : '');
if (missingHtml.length) console.log(`Missing HTML (${missingHtml.length}):`, missingHtml.slice(0, 8).join(', '), missingHtml.length > 8 ? '…' : '');

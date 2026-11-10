#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { loadMirrorScreens } from './lib/load-screens.mjs';
import { loadTabletViewport } from './lib/tablet-viewport.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(prototypeRoot, 'visual-compare', 'html');
const baseUrl = process.env.PROTOTYPE_URL || 'http://localhost:5173';
const { width: WIDTH, height: HEIGHT } = loadTabletViewport();

const screens = loadMirrorScreens(prototypeRoot);
const seenHtml = new Set();

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

let captured = 0;
for (const screen of screens) {
  if (seenHtml.has(screen.html)) continue;
  seenHtml.add(screen.html);
  const url = `${baseUrl}/${screen.html}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.evaluate(() => {
    if (window.KinPrototype?.mountDebugChrome) window.KinPrototype.mountDebugChrome();
    if (window.KinPrototype?.setDebugOpen) window.KinPrototype.setDebugOpen(false);
    if (window.KinPrototype?.mountCharts) window.KinPrototype.mountCharts();
    if (window.KinPrototype?.mountAvatars) window.KinPrototype.mountAvatars();
    document.body.classList.add('proto-capture');
  });
  await page.waitForTimeout(150);
  const file = path.join(outDir, screen.slug + '.png');
  const main = page.locator('.device-frame .app__content').first();
  const hasMain = await main.count();
  if (hasMain) {
    await main.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  captured += 1;
}

await browser.close();
console.log(`Wrote ${captured} HTML screenshots to ${outDir}`);

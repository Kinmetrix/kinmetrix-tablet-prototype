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
// Pad the browser chrome so a fixed 1180×820 device-frame fits without scroll chrome.
const page = await browser.newPage({
  viewport: { width: WIDTH + 48, height: HEIGHT + 48 },
});

let captured = 0;
for (const screen of screens) {
  if (seenHtml.has(screen.html)) continue;
  seenHtml.add(screen.html);
  const url = `${baseUrl}/${screen.html}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.evaluate(() => {
    if (window.KinPrototype?.mountDebugChrome) window.KinPrototype.mountDebugChrome();
    if (window.KinPrototype?.setDebugOpen) window.KinPrototype.setDebugOpen(false);
    if (window.KinPrototype?.setCompareOpen) window.KinPrototype.setCompareOpen(false);
    if (window.KinPrototype?.mountCharts) window.KinPrototype.mountCharts();
    if (window.KinPrototype?.mountAvatars) window.KinPrototype.mountAvatars();
    document.body.classList.add('proto-capture');
  });
  await page.waitForTimeout(150);
  const file = path.join(outDir, screen.slug + '.png');
  const frame = page.locator('.device-frame').first();
  if ((await frame.count()) > 0) {
    const box = await frame.boundingBox();
    if (!box) {
      throw new Error(`No bounding box for .device-frame on ${screen.html}`);
    }
    // Clip to the tablet canvas. Element screenshots of .app__content follow scrollHeight
    // and produce tall portrait tiles on long screens (e.g. device-control).
    await page.screenshot({
      path: file,
      clip: {
        x: box.x,
        y: box.y,
        width: WIDTH,
        height: HEIGHT,
      },
    });
  } else {
    await page.screenshot({
      path: file,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
  }
  captured += 1;
}

await browser.close();
console.log(`Wrote ${captured} HTML screenshots (${WIDTH}×${HEIGHT}) to ${outDir}`);

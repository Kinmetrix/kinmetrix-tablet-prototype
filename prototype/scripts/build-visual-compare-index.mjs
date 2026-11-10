#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorScreens } from './lib/load-screens.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pairsDir = path.join(prototypeRoot, 'visual-compare', 'pairs');
const htmlDir = path.join(prototypeRoot, 'visual-compare', 'html');
const rnDir = path.join(prototypeRoot, 'visual-compare', 'rn');

const screens = loadMirrorScreens(prototypeRoot);

const seen = new Set();
const rows = [];
for (const s of screens) {
  if (seen.has(s.slug)) continue;
  seen.add(s.slug);
  const pair = path.join(pairsDir, `${s.slug}.png`);
  const hasPair = fs.existsSync(pair);
  const hasRn = fs.existsSync(path.join(rnDir, `${s.slug}.png`));
  const hasHtml = fs.existsSync(path.join(htmlDir, `${s.slug}.png`));
  rows.push({ ...s, hasPair, hasRn, hasHtml });
}

let body = rows
  .map((r) => {
    const img = r.hasPair
      ? `<img src="pairs/${r.slug}.png" alt="${r.route}" loading="lazy" style="max-width:100%;border:1px solid #ccc" />`
      : `<p>RN ${r.hasRn ? '✓' : '—'} · HTML ${r.hasHtml ? '✓' : '—'}</p>`;
    return `<section id="${r.slug}"><h2>${r.title} <code>${r.route}</code></h2>${img}</section>`;
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Visual compare</title>
<style>body{font-family:system-ui;max-width:1400px;margin:1rem auto;padding:0 1rem} section{margin:2rem 0;border-top:1px solid #ddd;padding-top:1rem}</style>
</head><body><h1>KinmetrixApp vs HTML mirror</h1><p>Left = RN simulator · Right = prototype HTML</p>${body}</body></html>`;

fs.writeFileSync(path.join(prototypeRoot, 'visual-compare', 'index.html'), html);
console.log(`Wrote visual-compare/index.html (${rows.filter((r) => r.hasPair).length}/${rows.length} pairs)`);

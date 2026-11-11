#!/usr/bin/env node
/**
 * Enriched KMScreen routes must keep a visible `.wire-toolbar` in the RN-clean view.
 * Debug `screen-header` does not count (shared.js moves it out of capture).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorManifest } from './lib/load-screens.mjs';
import { hasWireToolbar, needsWireToolbar, routeFromHtml } from './lib/kmscreen-toolbar.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = loadMirrorManifest(prototypeRoot);

const missing = [];

for (const screen of manifest.screens) {
  const file = path.join(prototypeRoot, screen.html);
  if (!fs.existsSync(file)) {
    missing.push({ html: screen.html, reason: 'missing-file' });
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const route = routeFromHtml(text) || screen.route;
  if (!needsWireToolbar(route, text)) continue;
  if (!hasWireToolbar(text)) {
    missing.push({ html: screen.html, route, reason: 'missing-wire-toolbar' });
  }
}

if (missing.length > 0) {
  console.error(`kmscreen-toolbar: ${missing.length} screen(s) need a visible .wire-toolbar`);
  for (const row of missing) {
    console.error(`  - ${row.html} (${row.route || '?'}: ${row.reason})`);
  }
  process.exit(1);
}

console.log('kmscreen-toolbar: ok');
process.exit(0);

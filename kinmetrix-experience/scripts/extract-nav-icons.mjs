#!/usr/bin/env node
/**
 * Vendors Heroicons 24px outline + solid pairs for the sidebar nav.
 * License: MIT — https://heroicons.com
 *
 * Usage: node scripts/extract-nav-icons.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outFile = path.join(rootDir, 'dist/nav-icons.js');

/* Pulse uses Lucide-style activity stroke in app.js (no Heroicons solid pair). */
const map = {
  search: 'magnifying-glass',
  people: 'users',
  library: 'rectangle-stack',
  device: 'cpu-chip',
  settings: 'adjustments-horizontal',
  user: 'user',
  lock: 'lock-closed',
  logout: 'arrow-right-start-on-rectangle'
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'heroicons-'));
process.chdir(tmp);
execSync('npm pack heroicons', { stdio: 'pipe' });
const tgz = fs.readdirSync(tmp).find(f => f.startsWith('heroicons-') && f.endsWith('.tgz'));
execSync(`tar -xzf ${tgz}`, { stdio: 'pipe' });
const iconsRoot = path.join(tmp, 'package', '24');

function inner(svg) {
  return svg
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .replace(/\s*aria-hidden="true"/g, '')
    .replace(/\s*data-slot="icon"/g, '')
    .trim();
}

const sets = {};
for (const [key, file] of Object.entries(map)) {
  const outline = inner(fs.readFileSync(path.join(iconsRoot, 'outline', `${file}.svg`), 'utf8'));
  const solid = inner(fs.readFileSync(path.join(iconsRoot, 'solid', `${file}.svg`), 'utf8'));
  sets[key] = { heroicon: file, outline, solid };
}

const body = `/* Sidebar nav: Heroicons v2 MIT (https://heroicons.com) 24px outline + solid pairs.
   Regenerate: node scripts/extract-nav-icons.mjs */
const navIconSets=${JSON.stringify(sets, null, 1)};
`;

fs.writeFileSync(outFile, body);
console.log(`Wrote ${outFile}`);
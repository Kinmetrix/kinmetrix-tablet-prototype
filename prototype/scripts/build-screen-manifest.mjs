#!/usr/bin/env node
/**
 * Rebuilds docs/screen-index.md from the frozen in-repo screens.json.
 * Does not read any external app. Edit screens.json to change the inventory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScreensJson, readIgnoredSlugs } from './lib/load-screens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(prototypeRoot, '..');
const manifestPath = path.join(prototypeRoot, 'screens.json');

if (!fs.existsSync(manifestPath)) {
  console.error('Missing screens.json. Add routes there first (see docs/screen-inventory.md).');
  process.exit(1);
}

const manifest = loadScreensJson(prototypeRoot);
const ignored = readIgnoredSlugs(prototypeRoot);
const mirrored = manifest.screens.filter((s) => !ignored.has(s.slug));

manifest.generatedAt = new Date().toISOString();
manifest.frozen = true;
manifest.note =
  'In-repo source of truth. Edit this file to add/rename routes; do not regenerate from an external app.';
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

let md = `# Screen index

Active mirror routes from \`prototype/screens.json\` (excluding \`.screenignore\`).

Refresh this table:

\`\`\`bash
node scripts/build-screen-manifest.mjs
\`\`\`

| Route | Stack | HTML | Title |
| --- | --- | --- | --- |
`;
for (const s of mirrored) {
  md += `| ${s.route} | ${s.stack} | \`${s.html}\` | ${s.title} |\n`;
}
fs.writeFileSync(path.join(repoRoot, 'prototype/docs/screen-index.md'), md);

console.log(`Wrote screen-index.md (${mirrored.length} mirror routes of ${manifest.screens.length} total)`);

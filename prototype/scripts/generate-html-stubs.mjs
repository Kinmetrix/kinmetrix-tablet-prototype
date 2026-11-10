#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorManifest, removeIgnoredHtmlFiles } from './lib/load-screens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(prototypeRoot, 'screens.json');

if (!fs.existsSync(manifestPath)) {
  console.error('Missing screens.json. Run build-screen-manifest.mjs first.');
  process.exit(1);
}

const { screens, unknownIgnoredSlugs } = loadMirrorManifest(prototypeRoot);
if (unknownIgnoredSlugs.length > 0) {
  console.warn('Unknown slugs in .screenignore (not in screens.json):', unknownIgnoredSlugs.join(', '));
}
const removedIgnored = removeIgnoredHtmlFiles(prototypeRoot);
if (removedIgnored.length > 0) {
  console.log('Removed ignored mirror pages:', removedIgnored.join(', '));
}

function stubHtml(screen) {
  const linkItems = screen.links?.length
    ? screen.links
        .map((href) => {
          const label = href.replace(/\.html$/, '').replace(/-/g, ' ');
          return `        <li><a href="${href}">${label}</a></li>`;
        })
        .join('\n')
    : '        <li><em>No suggested links</em></li>';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${screen.title} · Kinmetrix prototype</title>
    <link rel="stylesheet" href="kin-prototype.css" />
  </head>
  <body data-route="${screen.route}">
    <div class="device-frame">
      <header class="screen-header">
        <a class="back-link" href="index.html">All screens</a>
        <p class="route-chip">${screen.route} <span class="stack-tag">${screen.stack}</span></p>
        <h1>${screen.title}</h1>
        <p class="stub-note">Layout stub. Replace with markup from KinmetrixApp.</p>
      </header>
      <main class="app__content">
        <section class="placeholder-panel">
          <p>Placeholder content. No validation or live data.</p>
        </section>
        <section class="suggested-nav">
          <h2>Suggested links</h2>
          <ul>
${linkItems}
          </ul>
        </section>
      </main>
    </div>
    <script src="shared.js"></script>
  </body>
</html>
`;
}

let created = 0;
let skipped = 0;

for (const screen of screens) {
  const file = path.join(prototypeRoot, screen.html);
  if (fs.existsSync(file) && process.env.FORCE_STUBS !== '1') {
    skipped += 1;
    continue;
  }
  fs.writeFileSync(file, stubHtml(screen));
  created += 1;
}

function indexHtml(screens) {
  const byStack = new Map();
  for (const s of screens) {
    if (!byStack.has(s.stack)) byStack.set(s.stack, []);
    byStack.get(s.stack).push(s);
  }

  const sections = [...byStack.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([stack, items]) => {
      const links = items
        .map((s) => `          <li><a href="${s.html}"><code>${s.route}</code> — ${s.title}</a></li>`)
        .join('\n');
      return `      <section class="stack-section">
        <h2>${stack}</h2>
        <ul class="screen-directory">
${links}
        </ul>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kinmetrix tablet prototype</title>
    <link rel="stylesheet" href="kin-prototype.css" />
  </head>
  <body>
    <div class="device-frame">
      <header class="screen-header">
        <h1>Kinmetrix HTML mirror</h1>
        <p class="stub-note">${screens.length} screens from KinmetrixApp navigators. No login gate.</p>
        <p class="quick-start">
          <a href="home.html">Member home</a>
          ·
          <a href="team-home.html">Team roster</a>
          ·
          <a href="login.html">Login</a>
        </p>
      </header>
      <main class="app__content index-directory">
${sections}
      </main>
    </div>
    <script src="shared.js"></script>
  </body>
</html>
`;
}

fs.writeFileSync(path.join(prototypeRoot, 'index.html'), indexHtml(screens));

console.log(`HTML stubs: ${created} written, ${skipped} skipped (set FORCE_STUBS=1 to overwrite).`);

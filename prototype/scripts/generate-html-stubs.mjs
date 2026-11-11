#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorManifest, removeIgnoredHtmlFiles } from './lib/load-screens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(prototypeRoot, 'screens.json');

if (!fs.existsSync(manifestPath)) {
  console.error('Missing screens.json. See docs/screen-inventory.md.');
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
        <p class="stub-note">Layout stub. Replace with wireframe markup per product docs.</p>
      </header>
      <main class="app__content">
        <div class="wire-toolbar">
          <div class="wire-toolbar__left"></div>
          <p class="wire-toolbar__title">${screen.title}</p>
          <div class="wire-toolbar__right"></div>
        </div>
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

function assetExists(kind, slug) {
  return fs.existsSync(path.join(prototypeRoot, 'visual-compare', kind, `${slug}.png`));
}

function shotCell(slug, kind, label) {
  const rel = `visual-compare/${kind}/${slug}.png`;
  if (!assetExists(kind, slug)) {
    return `            <td class="index-shot index-shot--missing"><span class="index-shot__missing">Missing</span></td>`;
  }
  return `            <td class="index-shot">
              <button
                type="button"
                class="index-thumb"
                data-preview-src="${rel}"
                data-preview-kind="${label}"
                data-preview-slug="${slug}"
                aria-label="${slug} ${label} preview"
              >
                <img src="${rel}" alt="" loading="lazy" width="96" height="67" />
              </button>
            </td>`;
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
      const rows = items
        .map((s) => {
          const rn = assetExists('rn', s.slug) ? `visual-compare/rn/${s.slug}.png` : '';
          const htmlShot = assetExists('html', s.slug) ? `visual-compare/html/${s.slug}.png` : '';
          const pair = assetExists('pairs', s.slug) ? `visual-compare/pairs/${s.slug}.png` : '';
          return `          <tr
            data-slug="${s.slug}"
            data-title="${s.title.replace(/"/g, '&quot;')}"
            data-rn="${rn}"
            data-html-shot="${htmlShot}"
            data-pair="${pair}"
          >
            <th scope="row"><a href="${s.html}">${s.title}</a></th>
${shotCell(s.slug, 'rn', 'iOS')}
${shotCell(s.slug, 'html', 'HTML')}
${shotCell(s.slug, 'pairs', 'Pair')}
          </tr>`;
        })
        .join('\n');
      return `      <section class="stack-section">
        <h2>${stack}</h2>
        <div class="index-table-wrap">
          <table class="index-screen-table">
            <thead>
              <tr>
                <th scope="col">Screen</th>
                <th scope="col">iOS</th>
                <th scope="col">HTML</th>
                <th scope="col">Pair</th>
              </tr>
            </thead>
            <tbody>
${rows}
            </tbody>
          </table>
        </div>
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
  <body data-index="true">
    <div class="device-frame device-frame--index">
      <header class="screen-header">
        <h1>Kinmetrix HTML mirror</h1>
        <p class="stub-note">${screens.length} screens in this prototype. No login gate.</p>
        <p class="quick-start">
          <a href="home.html">Member home</a>
          ·
          <a href="team-home.html">Team roster</a>
          ·
          <a href="login.html">Login</a>
        </p>
        <p class="enriched-meta">Hover a thumbnail to peek. Click to open full preview (Esc or X to close).</p>
      </header>
      <main class="app__content index-directory">
${sections}
      </main>
    </div>
    <div id="index-peek" class="index-peek" hidden>
      <p class="index-peek__label"></p>
      <img class="index-peek__img" alt="" />
    </div>
    <div id="index-lightbox" class="index-lightbox" hidden>
      <div class="index-lightbox__panel" role="dialog" aria-modal="true" aria-labelledby="index-lightbox-title">
        <div class="index-lightbox__head">
          <h2 id="index-lightbox-title" class="index-lightbox__title"></h2>
          <button type="button" class="index-lightbox__close" aria-label="Close preview">X</button>
        </div>
        <div class="index-lightbox__tabs" role="tablist"></div>
        <img class="index-lightbox__img" alt="" />
      </div>
    </div>
    <script src="shared.js"></script>
  </body>
</html>
`;
}

fs.writeFileSync(path.join(prototypeRoot, 'index.html'), indexHtml(screens));

console.log(`HTML stubs: ${created} written, ${skipped} skipped (set FORCE_STUBS=1 to overwrite).`);

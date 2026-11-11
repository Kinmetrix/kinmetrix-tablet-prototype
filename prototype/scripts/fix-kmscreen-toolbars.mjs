#!/usr/bin/env node
/**
 * Ensures enriched KMScreen mirrors have a full-bleed `.wire-toolbar` as the first
 * child of `.app__content`, with Back from screen-header when present.
 *
 * Usage: node scripts/fix-kmscreen-toolbars.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorManifest } from './lib/load-screens.mjs';
import {
  hasWireToolbar,
  needsWireToolbar,
  routeFromHtml,
} from './lib/kmscreen-toolbar.mjs';

const dryRun = process.argv.includes('--dry-run');
const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = loadMirrorManifest(prototypeRoot);

function decodeBasicEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function parseScreenHeader(html) {
  const headerMatch = html.match(/<header class="screen-header">([\s\S]*?)<\/header>/);
  if (!headerMatch) return { backHref: null, backLabel: null, title: null };
  const block = headerMatch[1];
  const back = block.match(/<a class="back-link" href="([^"]+)">([^<]*)<\/a>/);
  const h1 = block.match(/<h1>([\s\S]*?)<\/h1>/);
  return {
    backHref: back ? back[1] : null,
    backLabel: back ? decodeBasicEntities(back[2].trim()) : null,
    title: h1 ? decodeBasicEntities(h1[1].replace(/\s+/g, ' ').trim()) : null,
  };
}

function classifyRightButton(label, href) {
  const text = (label || '').trim();
  const lower = text.toLowerCase();
  if (/^(\+|add)\b/i.test(text) || /^add\b/i.test(lower)) {
    return { className: 'wire-btn wire-btn--add', label: text.startsWith('+') ? text : `+ ${text}` };
  }
  if (/\b(create|save|submit|done|update)\b/i.test(lower)) {
    return { className: 'wire-btn wire-btn--header', label: text };
  }
  if (href && /add-/i.test(href)) {
    return { className: 'wire-btn wire-btn--add', label: text.startsWith('+') ? text : `+ ${text}` };
  }
  return { className: 'wire-btn wire-btn--ghost', label: text };
}

function buildToolbarHtml({ title, backHref, backLabel, rightHtml }) {
  const showBack = backLabel && /^back$/i.test(backLabel) && backHref;
  const left = showBack
    ? `<div class="wire-toolbar__left"><a class="wire-toolbar-back" href="${backHref}">&lt; Back</a></div>`
    : `<div class="wire-toolbar__left"></div>`;
  const right = rightHtml
    ? `<div class="wire-toolbar__right">${rightHtml}</div>`
    : `<div class="wire-toolbar__right"></div>`;
  const safeTitle = title || '';
  return `<div class="wire-toolbar">
          ${left}
          <p class="wire-toolbar__title">${safeTitle}</p>
          ${right}
        </div>`;
}

function extractExistingToolbar(html) {
  const m = html.match(/<div class="wire-toolbar"[^>]*>([\s\S]*?)<\/div>\s*/);
  if (!m) return null;
  const inner = m[1];
  const titleMatch = inner.match(/class="wire-toolbar__title"[^>]*>([\s\S]*?)<\/p>/);
  const title = titleMatch ? decodeBasicEntities(titleMatch[1].replace(/\s+/g, ' ').trim()) : null;
  const rightLink = inner.match(
    /<(a|button)([^>]*class="[^"]*wire-btn[^"]*"[^>]*)>([\s\S]*?)<\/\1>/
  );
  let rightHtml = null;
  if (rightLink) {
    const tag = rightLink[1];
    const attrs = rightLink[2];
    const label = decodeBasicEntities(rightLink[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    const hrefMatch = attrs.match(/href="([^"]+)"/);
    const href = hrefMatch ? hrefMatch[1] : null;
    const typed = classifyRightButton(label, href);
    if (tag === 'a' && href) {
      rightHtml = `<a class="${typed.className}" href="${href}">${typed.label}</a>`;
    } else {
      rightHtml = `<button class="${typed.className}" type="button">${typed.label}</button>`;
    }
  }
  return { full: m[0], title, rightHtml };
}

function ensureMainStartsWithToolbar(html, toolbarHtml) {
  let next = html.replace(/<div class="wire-toolbar"[^>]*>[\s\S]*?<\/div>\s*/g, '');
  const mainRe = /(<main\b[^>]*>)(\s*)/;
  if (!mainRe.test(next)) return next;
  return next.replace(mainRe, `$1\n        ${toolbarHtml}\n        `);
}

function fixFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const route = routeFromHtml(html);
  if (!needsWireToolbar(route, html)) {
    return { changed: false, reason: 'skipped' };
  }

  const header = parseScreenHeader(html);
  const existing = hasWireToolbar(html) ? extractExistingToolbar(html) : null;
  const title = existing?.title || header.title || route;
  const rightHtml = existing?.rightHtml || null;
  const toolbarHtml = buildToolbarHtml({
    title,
    backHref: header.backHref,
    backLabel: header.backLabel,
    rightHtml,
  });

  const next = ensureMainStartsWithToolbar(html, toolbarHtml);
  if (next === html) return { changed: false, reason: 'unchanged' };
  if (!dryRun) fs.writeFileSync(filePath, next);
  return { changed: true, reason: existing ? 'normalized' : 'inserted' };
}

let changed = 0;
let skipped = 0;

for (const screen of manifest.screens) {
  const file = path.join(prototypeRoot, screen.html);
  if (!fs.existsSync(file)) continue;
  const result = fixFile(file);
  if (result.changed) {
    changed += 1;
    console.log(`${dryRun ? '[dry-run] ' : ''}${screen.html}: ${result.reason}`);
  } else {
    skipped += 1;
  }
}

console.log(
  `fix-kmscreen-toolbars: ${changed} updated, ${skipped} unchanged/skipped${dryRun ? ' (dry-run)' : ''}`
);

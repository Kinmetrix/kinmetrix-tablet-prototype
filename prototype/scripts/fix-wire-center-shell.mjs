#!/usr/bin/env node
/**
 * Keep `.wire-toolbar` pinned to the top of `.app__content`.
 * Move vertical centering onto an inner `.wire-center` so the header
 * is not mid-screen. Drop in-form Create/Save when the toolbar already has it.
 *
 * Also repairs a prior bad extract that closed the toolbar on the first nested </div>.
 *
 * Usage: node scripts/fix-wire-center-shell.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMirrorManifest } from './lib/load-screens.mjs';

const dryRun = process.argv.includes('--dry-run');
const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = loadMirrorManifest(prototypeRoot);

function sliceBalancedDiv(html, startIdx) {
  if (startIdx < 0 || !html.startsWith('<div', startIdx)) return null;
  let i = html.indexOf('>', startIdx) + 1;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose < 0) return null;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      i = nextClose + '</div>'.length;
    }
  }
  return { start: startIdx, end: i, html: html.slice(startIdx, i) };
}

function stripDuplicateHeaderSubmit(inner, hasHeaderAction) {
  if (!hasHeaderAction) return inner;
  return inner.replace(
    /\n?\s*<button class="wire-btn wire-btn--primary"[^>]*>\s*(Create|Save|Submit|Update|Done)[^<]*<\/button>\s*/gi,
    '\n'
  );
}

function repairBrokenToolbarSplit(mainInner) {
  // Broken shape: <div class="wire-toolbar"> <left/> <div class="wire-center"> title right </div> rest </div>?
  const broken = mainInner.match(
    /^\s*<div class="wire-toolbar">\s*(<div class="wire-toolbar__left">[\s\S]*?<\/div>)\s*<div class="wire-center">\s*(<p class="wire-toolbar__title">[\s\S]*?<\/p>)\s*(<div class="wire-toolbar__right">[\s\S]*?<\/div>)\s*<\/div>\s*([\s\S]*)$/
  );
  if (!broken) return null;
  const [, left, title, right, restRaw] = broken;
  let rest = restRaw.trim();
  // Drop a dangling closing </div> that belonged to the truncated toolbar.
  if (rest.startsWith('</div>')) rest = rest.slice('</div>'.length).trim();
  // Sometimes the form section is closed then an extra </div> before nav.
  rest = rest.replace(
    /(<\/section>)\s*<\/div>\s*(<nav class="flow-nav")/i,
    '$1\n        $2'
  );
  const toolbar = `<div class="wire-toolbar">
          ${left}
          ${title}
          ${right}
        </div>`;
  return { toolbar, rest };
}

function splitToolbarAndRest(mainInner) {
  const repaired = repairBrokenToolbarSplit(mainInner);
  if (repaired) return repaired;

  const start = mainInner.search(/<div class="wire-toolbar">/);
  if (start < 0) return { toolbar: '', rest: mainInner.trim() };
  const sliced = sliceBalancedDiv(mainInner, start);
  if (!sliced) return { toolbar: '', rest: mainInner.trim() };
  const before = mainInner.slice(0, start).trim();
  const after = mainInner.slice(sliced.end).trim();
  const rest = [before, after].filter(Boolean).join('\n');
  return { toolbar: sliced.html, rest };
}

function peelFlowNav(rest) {
  const fn = rest.match(/(\s*<nav class="flow-nav"[\s\S]*?<\/nav>)\s*$/);
  if (!fn) return { body: rest.trim(), flowNav: '' };
  return {
    body: rest.slice(0, -fn[0].length).trim(),
    flowNav: fn[1],
  };
}

function rebuildMain(attrs, toolbar, body, flowNav) {
  const parts = ['<main class="app__content"' + attrs + '>'];
  if (toolbar) parts.push(`        ${toolbar}`);
  if (body) {
    // Already wrapped?
    if (/^<div class="wire-center">/.test(body) && /<\/div>\s*$/.test(body)) {
      parts.push(`        ${body}`);
    } else {
      parts.push(`        <div class="wire-center">
          ${body}
        </div>`);
    }
  }
  if (flowNav) parts.push(flowNav);
  parts.push('      </main>');
  return parts.join('\n');
}

function fixHtml(html) {
  // Match both still-broken wire-center mains and already-split mains that need repair.
  const mainRe = /<main class="app__content(?: wire-center)?"([^>]*)>([\s\S]*?)<\/main>/;
  const m = html.match(mainRe);
  if (!m) return { html, changed: false };

  const attrs = m[1] || '';
  const rawInner = m[2];
  const needsWork =
    /\bwire-center\b/.test(m[0]) ||
    /<div class="wire-toolbar">\s*<div class="wire-toolbar__left">/.test(rawInner);

  // Skip clean pages that already have toolbar then wire-center correctly.
  const alreadyGood =
    /<div class="wire-toolbar">[\s\S]*?<\/div>\s*<div class="wire-center">/.test(rawInner) &&
    !/<div class="wire-toolbar">\s*<div class="wire-toolbar__left">[\s\S]*?<\/div>\s*<div class="wire-center">\s*<p class="wire-toolbar__title">/.test(
      rawInner
    );
  if (alreadyGood && !/<main class="app__content wire-center"/.test(html)) {
    // Still strip duplicate submits.
    const hasHeaderAction = /wire-btn--header/.test(rawInner);
    const cleaned = stripDuplicateHeaderSubmit(rawInner, hasHeaderAction);
    if (cleaned === rawInner) return { html, changed: false };
    return {
      html: html.replace(mainRe, `<main class="app__content"${attrs}>${cleaned}</main>`),
      changed: true,
    };
  }

  if (!needsWork && alreadyGood) return { html, changed: false };

  const { toolbar, rest } = splitToolbarAndRest(rawInner);
  const hasHeaderAction = /wire-btn--header/.test(toolbar);
  let { body, flowNav } = peelFlowNav(rest);
  body = stripDuplicateHeaderSubmit(body, hasHeaderAction);

  const rebuilt = rebuildMain(attrs, toolbar, body, flowNav);
  const next = html.replace(mainRe, rebuilt);
  return { html: next, changed: next !== html };
}

let changed = 0;
for (const screen of manifest.screens) {
  const file = path.join(prototypeRoot, screen.html);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const { html, changed: did } = fixHtml(before);
  if (!did) continue;
  changed += 1;
  console.log(`${dryRun ? '[dry-run] ' : ''}${screen.html}`);
  if (!dryRun) fs.writeFileSync(file, html);
}

console.log(`fix-wire-center-shell: ${changed} updated${dryRun ? ' (dry-run)' : ''}`);

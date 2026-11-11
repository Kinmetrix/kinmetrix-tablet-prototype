#!/usr/bin/env node
/**
 * Finish onboarding captures from the current wizard step on Kinmetrix IPad.
 * Usage (from prototype/): node scripts/capture-rn-onboarding-rest.mjs [startSlug]
 * Assumes the sim is already on that slug's screen (or the first missing after it).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { rotateRnLandscape } from './lib/rotate-rn-png.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const device = JSON.parse(fs.readFileSync(path.join(root, 'visual-compare/device.json'), 'utf8'));
const rnDir = path.join(root, 'visual-compare/rn');
const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kin-rn-ob-'));
const DEVICE = device.simulatorName;

const STEPS = [
  { slug: 'onboarding-sport', action: 'skip' },
  { slug: 'onboarding-position', action: 'skip' },
  { slug: 'onboarding-hand', action: 'choice', tap: [480, 420] },
  { slug: 'onboarding-competition-level', action: 'skip' },
  { slug: 'onboarding-email', action: 'fill', text: 'alex.morgan@example.com' },
  { slug: 'onboarding-onboarding-confirmation', action: 'capture-only' },
];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ad(...args) {
  return execFileSync('agent-device', [...args, '--device', DEVICE], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function press(x, y, settle = false) {
  const args = ['press', String(x), String(y)];
  if (settle) args.push('--settle');
  console.log('press', x, y, settle ? '--settle' : '');
  try {
    console.log(ad(...args).trim().split('\n').slice(0, 3).join(' | '));
  } catch (e) {
    console.log(String(e.stdout || e.stderr || e).slice(0, 200));
  }
}

function typeText(text) {
  console.log('type', text);
  try {
    console.log(ad('type', text, '--delay-ms', '12').trim());
  } catch (e) {
    console.log(String(e.stdout || e.stderr || e).slice(0, 200));
  }
}

function dismissKeyboard() {
  try {
    console.log(ad('keyboard', 'dismiss').trim());
  } catch (e) {
    console.log('keyboard', String(e.stdout || e.stderr || e).slice(0, 120));
  }
}

async function shotNav() {
  const out = path.join(scratchDir, 'nav.png');
  ad('screenshot', out);
  await sharp(out).rotate(90).toFile(path.join(scratchDir, 'nav-l.png'));
}

async function findNext() {
  const { data, info } = await sharp(path.join(scratchDir, 'nav-l.png'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const lum = (x, y) => {
    const i = (y * w + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };
  const hits = [];
  for (let y = 300; y < 720; y++) {
    let c = 0,
      xmin = null,
      xmax = null;
    for (let x = 250; x < 950; x++) {
      if (lum(x, y) < 45) {
        c++;
        xmin = xmin ?? x;
        xmax = x;
      }
    }
    if (c > 250) hits.push({ y, c, xmin, xmax });
  }
  const bands = [];
  for (const h of hits) {
    const last = bands[bands.length - 1];
    if (last && h.y === last.y1 + 1) {
      last.y1 = h.y;
      last.c += h.c;
      last.xmin = Math.min(last.xmin, h.xmin);
      last.xmax = Math.max(last.xmax, h.xmax);
    } else bands.push({ y0: h.y, y1: h.y, c: h.c, xmin: h.xmin, xmax: h.xmax });
  }
  bands.sort((a, b) => b.c - a.c);
  const n = bands[0];
  if (!n) return { x: 590, y: 560 };
  return { x: Math.round((n.xmin + n.xmax) / 2), y: Math.round((n.y0 + n.y1) / 2), h: n.y1 - n.y0 };
}

async function findRedField() {
  const { data, info } = await sharp(path.join(scratchDir, 'nav-l.png'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const isRed = (x, y) => {
    const i = (y * w + x) * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    return r > 160 && g < 120 && b < 120 && r - g > 40;
  };
  const xs = [],
    ys = [];
  for (let y = 200; y < 600; y++) {
    for (let x = 200; x < 1000; x++) {
      if (isRed(x, y)) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (!xs.length) return null;
  return {
    x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
    y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2),
  };
}

async function findSkipBelowNext(next) {
  // Skip is text under Next — tap center ~36px below Next bottom
  return { x: next.x, y: next.y + Math.round((next.h || 38) / 2) + 36 };
}

async function captureSlug(slug) {
  const out = path.join(rnDir, `${slug}.png`);
  const tmp = out + '.raw.png';
  execFileSync('xcrun', ['simctl', 'io', device.udid, 'screenshot', tmp], { stdio: 'inherit' });
  fs.renameSync(tmp, out);
  await rotateRnLandscape(out);
  console.log('captured', slug);
}

const start = process.argv[2] || 'onboarding-sport';
const startIdx = STEPS.findIndex((s) => s.slug === start);
if (startIdx < 0) {
  console.error('unknown start', start);
  process.exit(1);
}

for (let i = startIdx; i < STEPS.length; i++) {
  const step = STEPS[i];
  console.log('\n===', step.slug, step.action);
  await shotNav();
  await captureSlug(step.slug);

  if (step.action === 'capture-only') break;

  if (step.action === 'fill') {
    await shotNav();
    let field = await findRedField();
    if (!field) field = { x: 590, y: 444 };
    press(field.x, field.y, false);
    sleep(250);
    typeText(step.text);
    sleep(300);
    dismissKeyboard();
    sleep(300);
    await shotNav();
    const next = await findNext();
    press(next.x, next.y, true);
    sleep(500);
    continue;
  }

  if (step.action === 'choice') {
    press(step.tap[0], step.tap[1], false);
    sleep(400);
    await shotNav();
    const next = await findNext();
    press(next.x, next.y, true);
    sleep(500);
    continue;
  }

  if (step.action === 'skip') {
    const next = await findNext();
    const skip = await findSkipBelowNext(next);
    console.log('skip at', skip);
    press(skip.x, skip.y, true);
    sleep(600);
    // If still on same screen (skip miss), try Next then Skip lower
    await shotNav();
    continue;
  }
}

console.log('onboarding-rest done');

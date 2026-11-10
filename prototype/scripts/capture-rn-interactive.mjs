#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { loadMirrorScreens } from './lib/load-screens.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rnDir = path.join(prototypeRoot, 'visual-compare', 'rn');
const captureScript = path.join(prototypeRoot, 'scripts', 'capture-rn-screenshot.mjs');

const onlySlug = process.argv[2];

const seen = new Set();
const queue = loadMirrorScreens(prototypeRoot).filter((s) => {
  if (seen.has(s.slug)) return false;
  seen.add(s.slug);
  if (onlySlug && s.slug !== onlySlug) return false;
  return !fs.existsSync(path.join(rnDir, `${s.slug}.png`));
});

if (queue.length === 0) {
  console.log('No missing RN captures.');
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(line) {
  return new Promise((resolve) => rl.question(line, resolve));
}

console.log(`Kinmetrix IPad: navigate to each screen, then Enter to capture. Ctrl+C to stop.`);
console.log(`${queue.length} missing.\n`);

for (const screen of queue) {
  const answer = await ask(
    `[${screen.slug}] ${screen.route} — on screen? (Enter=capture, s=skip, q=quit) `
  );
  if (answer.trim().toLowerCase() === 'q') break;
  if (answer.trim().toLowerCase() === 's') {
    console.log('  skipped');
    continue;
  }
  execFileSync(process.execPath, [captureScript, screen.slug], { stdio: 'inherit', cwd: prototypeRoot });
  console.log('');
}

rl.close();

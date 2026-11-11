#!/usr/bin/env node
/**
 * Capture team / team-settings / member-home screens on Kinmetrix IPad.
 * Team pin: 5555. Always --device "Kinmetrix IPad".
 *
 * Modes:
 *   enter-team     — Enter Team View + PIN → team-home
 *   compare        — from Team Home: compare list + detail
 *   settings       — from Team Home: settings home + members + templates
 *   member         — from Team Home: proxy into user home stack
 *   onboarding     — from Team Home: New User wizard steps
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capture = path.join(prototypeRoot, 'scripts', 'capture-rn-screenshot.mjs');
const device = 'Kinmetrix IPad';
const bundle = 'com.timehero.Kinmetrix';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}
function snap(slug) {
  run(process.execPath, [capture, slug], { cwd: prototypeRoot });
}
function ad(...args) {
  run('agent-device', [...args]);
}
function press(x, y) {
  ad('press', String(x), String(y), '--settle');
}
async function waitText(text, ms = 8000) {
  try {
    ad('wait', 'text', text, '--timeout', String(ms));
  } catch {
    console.warn(`wait text failed: ${text}`);
  }
}

const mode = process.argv[2] || 'compare';

async function enterTeam() {
  try {
    ad('open', bundle, '--device', device, '--foreground');
  } catch {
    console.warn('open failed; continuing');
  }
  await sleep(1500);
  press(120, 55); // Enter Team View
  await sleep(800);
  for (let i = 0; i < 4; i++) {
    press(590, 431); // 5
    await sleep(180);
  }
  press(590, 659); // Submit
  await sleep(2500);
  await waitText('New User');
  snap('team-home');
}

async function compareFromHome() {
  press(900, 55); // Compare
  await sleep(1500);
  await waitText('Compare Team Sessions');
  snap('compare-team-user-sessions');
  // checkbox corners (not card body)
  press(200, 220);
  await sleep(300);
  press(700, 220);
  await sleep(800);
  press(590, 760); // Compare N sessions footer
  await sleep(1500);
  snap('compare-team-user-sessions-detail');
  press(50, 50); // Back
  await sleep(800);
  press(50, 50);
  await sleep(800);
}

async function settingsFromHome() {
  press(80, 55); // Settings
  await sleep(800);
  // PIN again for settings
  for (let i = 0; i < 4; i++) {
    press(590, 431);
    await sleep(180);
  }
  press(590, 659);
  await sleep(2000);
  snap('team-settings-home');
  // Members ~ mid-right of settings list (layout varies; try common row)
  press(700, 320);
  await sleep(1200);
  snap('team-user-list');
  press(950, 55); // Edit Columns
  await sleep(1000);
  snap('column-management');
  press(50, 50);
  await sleep(800);
  press(200, 280); // first member row
  await sleep(1200);
  snap('team-user-details');
  press(50, 50);
  await sleep(800);
  press(50, 50); // back to settings home
  await sleep(800);
  // Onboarding settings / Session templates — tap list rows by scrolling down
  press(700, 420);
  await sleep(1000);
  snap('onboarding-preference');
  press(50, 50);
  await sleep(800);
  press(700, 500);
  await sleep(1000);
  snap('team-session-template-list');
  press(50, 50);
  await sleep(800);
  press(700, 580);
  await sleep(1000);
  snap('program-template-list');
  press(50, 50);
  await sleep(800);
  press(50, 50); // leave settings
  await sleep(1000);
}

async function memberFromHome() {
  press(200, 280); // Angele Test
  await sleep(2500);
  snap('home');
  snap('team-user');
  press(1050, 55); // Start
  await sleep(1200);
  snap('home-start');
  press(300, 400); // New Assessment-ish
  await sleep(1200);
  snap('assessment');
  press(50, 50);
  await sleep(800);
  press(1050, 55);
  await sleep(800);
  press(700, 400); // Run a Program
  await sleep(1200);
  snap('program-list');
  press(50, 50);
  await sleep(800);
  press(590, 55); // user menu
  await sleep(800);
  press(590, 200); // Edit profile-ish
  await sleep(1200);
  snap('user-profile');
  press(50, 50);
  await sleep(800);
}

async function onboardingFromHome() {
  press(1050, 55); // New User
  await sleep(1200);
  snap('onboarding-name');
  // advance with Next at ~bottom-right
  const steps = [
    'onboarding-height',
    'onboarding-weight',
    'onboarding-date-of-birth',
    'onboarding-current-team',
    'onboarding-sport',
    'onboarding-position',
    'onboarding-hand',
    'onboarding-competition-level',
    'onboarding-email',
    'onboarding-onboarding-confirmation',
  ];
  for (const slug of steps) {
    press(1050, 760); // Next
    await sleep(900);
    snap(slug);
  }
}

if (mode === 'enter-team') {
  await enterTeam();
} else if (mode === 'compare') {
  await compareFromHome();
} else if (mode === 'settings') {
  await settingsFromHome();
} else if (mode === 'member') {
  await memberFromHome();
} else if (mode === 'onboarding') {
  await onboardingFromHome();
} else if (mode === 'all-from-home') {
  await compareFromHome();
  await settingsFromHome();
  await memberFromHome();
} else {
  console.error('Unknown mode', mode);
  process.exit(1);
}

console.log(`Mode ${mode} done. Verify RN PNGs with Read before stitch.`);

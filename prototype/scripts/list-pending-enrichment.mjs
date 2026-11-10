#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
let limit = 5;
let asJson = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) limit = Number(args[++i]);
  if (args[i] === '--json') asJson = true;
}

import { loadMirrorManifest } from './lib/load-screens.mjs';

const prototypeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = loadMirrorManifest(prototypeRoot);

const PREFERRED_ROUTES = [
  'Login',
  'PasswordLogin',
  'PasswordReset',
  'SetPassword',
  'Loading',
  'TeamView',
  'UserView',
  'TeamHome',
  'TeamList',
  'Home',
  'HomeStart',
  'ProgramList',
  'Assessment',
  'Onboarding',
  'TeamUser',
  'TeamSettings',
  'SignWaiver',
  'WarmupType',
  'Exercise',
  'SessionData',
];

const STACK_ORDER = {
  user: 0,
  team: 1,
  'team-settings': 2,
  'onboarding-step': 3,
  app: 4,
};

const ONBOARDING_STEP_ORDER = [
  'OnboardingName',
  'OnboardingEmail',
  'OnboardingHeight',
  'OnboardingWeight',
  'OnboardingDateOfBirth',
  'OnboardingCurrentTeam',
  'OnboardingSport',
  'OnboardingPosition',
  'OnboardingHand',
  'OnboardingCompetitionLevel',
  'OnboardingOnboardingConfirmation',
];

function sortKey(screen) {
  const i = PREFERRED_ROUTES.indexOf(screen.route);
  return i >= 0 ? i : 1000;
}

function stackKey(screen) {
  return STACK_ORDER[screen.stack] ?? 5;
}

function onboardingKey(screen) {
  if (screen.stack !== 'onboarding-step') return 0;
  const i = ONBOARDING_STEP_ORDER.indexOf(screen.route);
  return i >= 0 ? i : 50;
}

const pending = manifest.screens.filter((screen) => {
  const file = path.join(prototypeRoot, screen.html);
  if (!fs.existsSync(file)) return true;
  const text = fs.readFileSync(file, 'utf8');
  return !/\bdata-enriched=["']true["']/.test(text);
});

pending.sort(
  (a, b) =>
    sortKey(a) - sortKey(b) ||
    stackKey(a) - stackKey(b) ||
    onboardingKey(a) - onboardingKey(b) ||
    a.route.localeCompare(b.route)
);

const batch = pending.slice(0, limit);
const payload = {
  pendingTotal: pending.length,
  total: manifest.screens.length,
  kinmetrixAppRoot: manifest.kinmetrixAppRoot,
  batch,
};

if (asJson) console.log(JSON.stringify(payload, null, 2));
else {
  console.log(`${pending.length} pending (showing ${batch.length})`);
  for (const s of batch) {
    const src = s.sourceFile ? ` ← ${s.sourceFile}` : '';
    console.log(`- ${s.html} (${s.route})${src}`);
  }
}

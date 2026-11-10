#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { indexScreenFiles, sourceFileForRoute } from './lib/screen-source.mjs';
import { readIgnoredSlugs } from './lib/load-screens.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prototypeRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(prototypeRoot, '..');

const defaultAppRoot = path.resolve(repoRoot, '../kinmetrix-clients/apps/KinmetrixApp');
const appRoot = process.env.KINMETRIX_APP_ROOT
  ? path.resolve(process.env.KINMETRIX_APP_ROOT)
  : defaultAppRoot;

const NAV_FILES = [
  { stack: 'app', file: 'src/navigation/AppNavigator.tsx' },
  { stack: 'team', file: 'src/navigation/TeamNavigator.tsx' },
  { stack: 'team-settings', file: 'src/navigation/TeamSettingsNavigator.tsx' },
  { stack: 'user', file: 'src/navigation/UserNavigator.tsx' },
];

const ONBOARDING_STEPS = [
  'Name',
  'Email',
  'Height',
  'Weight',
  'DateOfBirth',
  'CurrentTeam',
  'Sport',
  'Position',
  'Hand',
  'CompetitionLevel',
  'OnboardingConfirmation',
];

function routeToSlug(route) {
  return route
    .replace(/Screen$/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function extractRoutes(source) {
  const names = new Set();
  const re = /name=\{['"]([A-Za-z0-9_]+)['"]\}/g;
  let m;
  while ((m = re.exec(source)) !== null) names.add(m[1]);
  return [...names];
}

function titleFromRoute(route) {
  return route
    .replace(/Screen$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
}

const hubs = {
  TeamView: ['team-home'],
  UserView: ['home'],
  TeamUser: ['home'],
  TeamSettings: ['team-settings-home'],
  TeamHome: ['home'],
  Home: ['home-start', 'program-list', 'device-control'],
  HomeStart: ['assessment', 'warmup-type', 'program-list'],
};

if (!fs.existsSync(appRoot)) {
  console.error(`KinmetrixApp not found at ${appRoot}`);
  process.exit(1);
}

const routes = [];

for (const { stack, file } of NAV_FILES) {
  const full = path.join(appRoot, file);
  const text = fs.readFileSync(full, 'utf8');
  for (const route of extractRoutes(text)) {
    routes.push({
      route,
      stack,
      slug: routeToSlug(route),
      html: `${routeToSlug(route)}.html`,
      title: titleFromRoute(route),
      links: hubs[route] ?? [],
    });
  }
}

for (const step of ONBOARDING_STEPS) {
  const route = `Onboarding${step}`;
  routes.push({
    route,
    stack: 'onboarding-step',
    slug: routeToSlug(route),
    html: `${routeToSlug(route)}.html`,
    title: `Onboarding ${titleFromRoute(step)}`,
    links: [],
  });
}

const seen = new Set();
const unique = [];
for (const r of routes) {
  if (seen.has(r.route)) continue;
  seen.add(r.route);
  unique.push(r);
}

unique.sort((a, b) => a.stack.localeCompare(b.stack) || a.route.localeCompare(b.route));

const htmlByRoute = Object.fromEntries(unique.map((r) => [r.route, r.html]));

const screenIndex = indexScreenFiles(appRoot);
for (const r of unique) {
  r.sourceFile = sourceFileForRoute(appRoot, r.route, screenIndex);
}

for (const r of unique) {
  r.links = (r.links ?? [])
    .filter((target) => htmlByRoute[target] || unique.some((x) => x.slug === target))
    .map((target) => {
      const hit = unique.find((x) => x.slug === target || x.route === target);
      return hit?.html ?? (target.endsWith('.html') ? target : `${target}.html`);
    });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  kinmetrixAppRoot: appRoot,
  screens: unique,
};

fs.writeFileSync(path.join(prototypeRoot, 'screens.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const ignored = readIgnoredSlugs(prototypeRoot);
const mirrored = unique.filter((s) => !ignored.has(s.slug));

let md = `# Screen index\n\nGenerated from KinmetrixApp navigators. Routes in \`prototype/.screenignore\` are omitted from the HTML mirror.\n\nRegenerate:\n\n\`\`\`bash\nnode scripts/build-screen-manifest.mjs\nnode scripts/generate-html-stubs.mjs\n\`\`\`\n\n| Route | Stack | HTML | Title |\n| --- | --- | --- | --- |\n`;
for (const s of mirrored) {
  md += `| ${s.route} | ${s.stack} | \`${s.html}\` | ${s.title} |\n`;
}
fs.writeFileSync(path.join(repoRoot, 'prototype/docs/screen-index.md'), md);

console.log(`Wrote ${unique.length} routes to screens.json and screen-index.md`);

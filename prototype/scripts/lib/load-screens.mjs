import fs from 'node:fs';
import path from 'node:path';

const IGNORE_FILE = '.screenignore';

/** @param {string} prototypeRoot */
export function readIgnoredSlugs(prototypeRoot) {
  const ignorePath = path.join(prototypeRoot, IGNORE_FILE);
  if (!fs.existsSync(ignorePath)) return new Set();
  const ignored = new Set();
  for (const line of fs.readFileSync(ignorePath, 'utf8').split('\n')) {
    const slug = line.trim();
    if (!slug || slug.startsWith('#')) continue;
    ignored.add(slug);
  }
  return ignored;
}

/** @param {string} prototypeRoot */
export function loadScreensJson(prototypeRoot) {
  const manifestPath = path.join(prototypeRoot, 'screens.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

/**
 * Manifest with `screens` limited to mirror-active routes and `ignoredSlugs` from `.screenignore`.
 * @param {string} prototypeRoot
 */
export function loadMirrorManifest(prototypeRoot) {
  const manifest = loadScreensJson(prototypeRoot);
  const ignored = readIgnoredSlugs(prototypeRoot);
  const screens = manifest.screens.filter((s) => !ignored.has(s.slug));
  const unknown = [...ignored].filter((slug) => !manifest.screens.some((s) => s.slug === slug));
  return {
    ...manifest,
    screens,
    ignoredSlugs: [...ignored].sort(),
    unknownIgnoredSlugs: unknown.sort(),
  };
}

/** @param {string} prototypeRoot */
export function loadMirrorScreens(prototypeRoot) {
  return loadMirrorManifest(prototypeRoot).screens;
}

/**
 * Remove HTML files for ignored slugs when they still exist on disk.
 * @param {string} prototypeRoot
 */
export function removeIgnoredHtmlFiles(prototypeRoot) {
  const manifest = loadScreensJson(prototypeRoot);
  const ignored = readIgnoredSlugs(prototypeRoot);
  const removed = [];
  for (const screen of manifest.screens) {
    if (!ignored.has(screen.slug)) continue;
    const file = path.join(prototypeRoot, screen.html);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      removed.push(screen.html);
    }
  }
  return removed;
}

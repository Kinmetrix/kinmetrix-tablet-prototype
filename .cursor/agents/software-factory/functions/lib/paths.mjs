import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** Normalizes a repo-relative path to posix form without a leading './'; returns null for absolute or escaping paths. */
export function normalizeRepoPath(file) {
  if (typeof file !== 'string' || file === '' || path.isAbsolute(file)) return null;
  const normalized = path.posix.normalize(file.split(path.sep).join('/')).replace(/^\.\//, '').replace(/\/$/, '');
  if (normalized === '..' || normalized.startsWith('../')) return null;
  return normalized;
}

export function isWithin(file, roots) {
  return roots.some((root) => {
    const base = normalizeRepoPath(root);
    if (base === null) return false;
    return base === '.' || file === base || file.startsWith(`${base}/`);
  });
}

/** Files git reports as changed or untracked, relative to `repoRoot`; null when `repoRoot` is not in a git checkout. */
export function dirtyFiles(repoRoot) {
  const run = (args) => spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const prefix = run(['rev-parse', '--show-prefix']);
  if (prefix.error || prefix.status !== 0) return null;
  const status = run(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (status.error || status.status !== 0) return null;

  const base = prefix.stdout.trim();
  const tokens = status.stdout.split('\0');
  const files = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const entry = tokens[i];
    if (!entry) continue;
    const code = entry.slice(0, 2);
    const file = entry.slice(3);
    if (code[0] === 'R' || code[0] === 'C') i += 1;
    if (file.startsWith(base)) files.push(file.slice(base.length));
  }
  return [...new Set(files)].sort();
}

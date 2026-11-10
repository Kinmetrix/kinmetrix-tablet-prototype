import fs from 'node:fs';
import path from 'node:path';
import { StatesError } from './errors.mjs';

/**
 * Object store with S3 semantics over a local directory. Keys use '/' on every platform.
 * Handlers only see this interface, so an S3-backed store can replace it without changing them.
 */
export function createLocalStore(rootDir) {
  const root = path.resolve(rootDir);

  const resolveKey = (key) => {
    if (typeof key !== 'string' || key === '' || key.startsWith('/')) {
      throw new StatesError('Factory.InvalidKey', `Invalid store key '${key}'`);
    }
    const resolved = path.resolve(root, ...key.split('/'));
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new StatesError('Factory.InvalidKey', `Store key '${key}' escapes the store root`);
    }
    return resolved;
  };

  const listFiles = (dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(full) : [full];
    });
  };

  const toKey = (file) => path.relative(root, file).split(path.sep).join('/');

  const store = {
    root,
    resolve: resolveKey,
    async exists(key) {
      return fs.existsSync(resolveKey(key));
    },
    async getText(key) {
      const file = resolveKey(key);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        throw new StatesError('Factory.NoSuchKey', `Store key '${key}' does not exist`);
      }
      return fs.readFileSync(file, 'utf8');
    },
    async putText(key, text) {
      const file = resolveKey(key);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, text);
      fs.renameSync(temp, file);
    },
    async getJson(key) {
      const text = await store.getText(key);
      try {
        return JSON.parse(text);
      } catch {
        throw new StatesError('Factory.InvalidJson', `Store key '${key}' is not valid JSON`);
      }
    },
    async putJson(key, value) {
      await store.putText(key, `${JSON.stringify(value, null, 2)}\n`);
    },
    async delete(key) {
      fs.rmSync(resolveKey(key), { force: true });
    },
    async list(prefix) {
      const base = resolveKey(prefix.replace(/\/$/, ''));
      return listFiles(base).map(toKey).sort();
    },
    async copyPrefix(fromPrefix, toPrefix) {
      const keys = await store.list(fromPrefix);
      for (const key of keys) {
        const target = `${toPrefix}${key.slice(fromPrefix.length)}`;
        const file = resolveKey(target);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.copyFileSync(resolveKey(key), file);
      }
      return keys.length;
    },
  };
  return store;
}

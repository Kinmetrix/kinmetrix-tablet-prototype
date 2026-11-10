import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateDefinition } from './definition.mjs';
import { createStatesService } from './service.mjs';
import { createLocalStore } from './store.mjs';

export const FACTORY_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_MACHINE_NAME = 'software-factory';

const toPosix = (value) => value.split(path.sep).join('/');
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Repo root: FACTORY_REPO_ROOT, else the nearest git checkout holding this folder, else the cwd's checkout, else the cwd. */
export function findRepoRoot() {
  if (process.env.FACTORY_REPO_ROOT) return path.resolve(process.env.FACTORY_REPO_ROOT);
  for (let dir = FACTORY_DIR; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
  }
  const git = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return git.status === 0 ? git.stdout.trim() : process.cwd();
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error.message}`);
  }
}

function merge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return override === undefined ? base : override;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) out[key] = merge(base[key], value);
  return out;
}

function resolveResources(resourceMap) {
  const resources = new Map();
  for (const [placeholder, entry] of Object.entries(resourceMap)) {
    if (entry.type === 'activity') {
      resources.set(placeholder, { type: 'activity', name: entry.name, arn: `arn:local:states:::activity:${entry.name}` });
    } else if (entry.type === 'function') {
      const file = path.join(FACTORY_DIR, ...entry.handler.split('/'));
      resources.set(placeholder, {
        type: 'function',
        name: entry.name,
        arn: `arn:local:lambda:::function:${entry.name}`,
        handlerFile: file,
        invoke: async (event, context) => (await import(pathToFileURL(file).href)).handler(event, context),
      });
    } else {
      throw new Error(`Resource ${placeholder} has unknown type '${entry.type}'`);
    }
  }
  return resources;
}

function validateConfig(config, repoRoot) {
  const diagnostics = [];
  const report = (message, location) => diagnostics.push({ severity: 'ERROR', code: 'INVALID_CONFIG', message, location });
  const isText = (value) => typeof value === 'string' && value.trim() !== '';
  const isTextList = (value) => Array.isArray(value) && value.every(isText);

  if (!isText(config.artifactRoot)) report('artifactRoot must be a path', '/artifactRoot');
  if (!isText(config.executionRoot)) report('executionRoot must be a path', '/executionRoot');
  for (const [name, file] of Object.entries(config.templates ?? {})) {
    if (!isText(file) || !fs.existsSync(path.resolve(repoRoot, file))) report(`templates.${name} does not exist: ${file}`, `/templates/${name}`);
  }
  for (const required of ['prd', 'analysisStage']) {
    if (!config.templates?.[required]) report(`templates.${required} is required`, `/templates/${required}`);
  }
  if (!isTextList(config.context)) report('context must be a list of repo-relative paths', '/context');
  else for (const doc of config.context) if (!fs.existsSync(path.resolve(repoRoot, doc))) report(`context path does not exist: ${doc}`, '/context');
  if (!isTextList(config.codeRoots) || config.codeRoots.length === 0) report('codeRoots must list at least one repo-relative path', '/codeRoots');
  if (config.verify?.command !== null && !isText(config.verify?.command)) report('verify.command must be a shell command or null', '/verify/command');
  if (!(Number.isInteger(config.verify?.timeoutSeconds) && config.verify.timeoutSeconds > 0)) report('verify.timeoutSeconds must be a positive integer', '/verify/timeoutSeconds');
  for (const limit of ['maxRejections', 'maxRefineRounds']) {
    if (!(Number.isInteger(config.limits?.[limit]) && config.limits[limit] >= 0)) report(`limits.${limit} must be a non-negative integer`, `/limits/${limit}`);
  }
  return diagnostics;
}

/** Loads config, the state machine definition, and its local resource map, then builds the local service. */
export function loadFactory({ repoRoot = findRepoRoot(), now } = {}) {
  const defaults = readJsonFile(path.join(FACTORY_DIR, 'factory.config.json'));
  const localFile = path.join(FACTORY_DIR, 'factory.local.json');
  const settings = fs.existsSync(localFile) ? merge(defaults, readJsonFile(localFile)) : defaults;

  const factoryDir = toPosix(path.relative(repoRoot, FACTORY_DIR)) || '.';
  const expand = (value) => (typeof value === 'string' ? value.replaceAll('${factoryDir}', factoryDir) : value);
  const config = {
    ...settings,
    artifactRoot: expand(settings.artifactRoot),
    executionRoot: expand(settings.executionRoot),
    templates: Object.fromEntries(Object.entries(settings.templates ?? {}).map(([name, file]) => [name, expand(file)])),
    context: Array.isArray(settings.context) ? settings.context.map(expand) : settings.context,
    codeRoots: Array.isArray(settings.codeRoots) ? settings.codeRoots.map(expand) : settings.codeRoots,
  };

  const definition = readJsonFile(path.join(FACTORY_DIR, 'statemachine', 'factory.asl.json'));
  const resources = resolveResources(readJsonFile(path.join(FACTORY_DIR, 'statemachine', 'resources.local.json')));
  const store = createLocalStore(path.resolve(repoRoot, config.artifactRoot));
  const states = createStatesService({
    stateMachineName: STATE_MACHINE_NAME,
    definition,
    resources,
    executionRoot: path.resolve(repoRoot, config.executionRoot),
    functionContext: { store, config, repoRoot, factoryDir },
    now,
  });

  const validate = () => {
    const diagnostics = [...validateDefinition(definition, new Set(resources.keys())), ...validateConfig(config, repoRoot)];
    for (const [placeholder, resource] of resources) {
      if (resource.type === 'function' && !fs.existsSync(resource.handlerFile)) {
        diagnostics.push({ severity: 'ERROR', code: 'INVALID_RESOURCE', message: `Handler for ${placeholder} not found: ${resource.handlerFile}`, location: '/resources' });
      }
    }
    return diagnostics;
  };

  return { repoRoot, factoryDir, config, definition, resources, store, states, validate };
}

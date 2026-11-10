import { StatesError } from './errors.mjs';

const runtimeError = (message) => new StatesError('States.Runtime', message);

/**
 * Parses the reference-path subset of JSONPath that ASL allows in InputPath, OutputPath,
 * ResultPath, and `.$` fields: `$`, `$$`, `.name`, `['name']`, and `[index]`.
 */
export function parsePath(expr) {
  if (typeof expr !== 'string') throw runtimeError(`Path must be a string, got ${typeof expr}`);
  let root;
  let i;
  if (expr.startsWith('$$')) {
    root = 'context';
    i = 2;
  } else if (expr.startsWith('$')) {
    root = 'input';
    i = 1;
  } else {
    throw runtimeError(`Invalid path '${expr}': must start with '$'`);
  }

  const tokens = [];
  while (i < expr.length) {
    const rest = expr.slice(i);
    const dotted = /^\.([A-Za-z0-9_-]+)/.exec(rest);
    const indexed = /^\[(\d+)\]/.exec(rest);
    const quoted = /^\['((?:[^'\\]|\\.)*)'\]/.exec(rest);
    if (dotted) {
      tokens.push(dotted[1]);
      i += dotted[0].length;
    } else if (indexed) {
      tokens.push(Number(indexed[1]));
      i += indexed[0].length;
    } else if (quoted) {
      tokens.push(quoted[1].replace(/\\(.)/g, '$1'));
      i += quoted[0].length;
    } else {
      throw runtimeError(`Invalid path '${expr}': unsupported syntax at '${rest}'`);
    }
  }
  return { root, tokens };
}

function walk(base, tokens, expr) {
  let node = base;
  for (const token of tokens) {
    const found =
      typeof token === 'number'
        ? Array.isArray(node) && token < node.length
        : node !== null && typeof node === 'object' && !Array.isArray(node) && Object.hasOwn(node, token);
    if (!found) throw runtimeError(`The JSONPath '${expr}' could not be found in the input`);
    node = node[token];
  }
  return node;
}

export function readPath(expr, input, context) {
  const { root, tokens } = parsePath(expr);
  return walk(root === 'context' ? context : input, tokens, expr);
}

export function pathExists(expr, input, context) {
  try {
    readPath(expr, input, context);
    return true;
  } catch (error) {
    if (error instanceof StatesError) return false;
    throw error;
  }
}

/** Applies ResultPath semantics: returns a copy of `target` with `value` placed at `expr`. */
export function writePath(target, expr, value) {
  const { root, tokens } = parsePath(expr);
  if (root !== 'input') throw runtimeError(`ResultPath '${expr}' must reference the state input`);
  if (tokens.length === 0) return value;
  if (target === null || typeof target !== 'object' || Array.isArray(target)) {
    throw runtimeError(`ResultPath '${expr}' requires the state input to be a JSON object`);
  }

  const out = structuredClone(target);
  let node = out;
  for (const [index, token] of tokens.entries()) {
    if (typeof token === 'number') throw runtimeError(`ResultPath '${expr}' cannot index into arrays`);
    if (index === tokens.length - 1) {
      node[token] = value;
      break;
    }
    if (!Object.hasOwn(node, token)) node[token] = {};
    const child = node[token];
    if (child === null || typeof child !== 'object' || Array.isArray(child)) {
      throw runtimeError(`ResultPath '${expr}' crosses '${token}', which is not a JSON object`);
    }
    node = child;
  }
  return out;
}

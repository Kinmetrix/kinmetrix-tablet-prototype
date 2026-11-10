import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { StatesError } from './errors.mjs';
import { parsePath, readPath } from './jsonpath.mjs';

const failure = (message) => new StatesError('States.IntrinsicFailure', message);

const isScalar = (value) => value === null || typeof value !== 'object';

const INTRINSICS = {
  'States.Format': {
    arity: [1, Infinity],
    run([template, ...values]) {
      if (typeof template !== 'string') throw failure('States.Format template must be a string');
      const parts = template.split(/(?<!\\)\{\}/);
      if (parts.length - 1 !== values.length) {
        throw failure(`States.Format template has ${parts.length - 1} placeholders but got ${values.length} values`);
      }
      return parts.reduce((out, part, index) => {
        const text = part.replace(/\\([{}])/g, '$1');
        if (index === 0) return text;
        const value = values[index - 1];
        if (!isScalar(value)) throw failure('States.Format values must be strings, numbers, booleans, or null');
        return out + String(value) + text;
      }, '');
    },
  },
  'States.StringToJson': {
    arity: [1, 1],
    run([text]) {
      if (typeof text !== 'string') throw failure('States.StringToJson expects a string');
      try {
        return JSON.parse(text);
      } catch {
        throw failure('States.StringToJson received invalid JSON');
      }
    },
  },
  'States.JsonToString': { arity: [1, 1], run: ([value]) => JSON.stringify(value) },
  'States.Array': { arity: [0, Infinity], run: (values) => values },
  'States.ArrayLength': {
    arity: [1, 1],
    run([array]) {
      if (!Array.isArray(array)) throw failure('States.ArrayLength expects an array');
      return array.length;
    },
  },
  'States.ArrayContains': {
    arity: [2, 2],
    run([array, value]) {
      if (!Array.isArray(array)) throw failure('States.ArrayContains expects an array');
      return array.some((item) => isDeepStrictEqual(item, value));
    },
  },
  'States.MathAdd': {
    arity: [2, 2],
    run([a, b]) {
      if (!Number.isInteger(a) || !Number.isInteger(b)) throw failure('States.MathAdd expects two integers');
      return a + b;
    },
  },
  'States.UUID': { arity: [0, 0], run: () => randomUUID() },
};

function skipSpaces(parser) {
  while (parser.text[parser.i] === ' ') parser.i += 1;
}

function parseCall(parser) {
  const match = /^(States\.[A-Za-z]+)\(/.exec(parser.text.slice(parser.i));
  if (!match) throw failure(`Malformed intrinsic call at '${parser.text.slice(parser.i)}'`);
  const name = match[1];
  const spec = INTRINSICS[name];
  if (!spec) throw failure(`Unsupported intrinsic function ${name}`);
  parser.i += match[0].length;

  const args = [];
  skipSpaces(parser);
  if (parser.text[parser.i] === ')') {
    parser.i += 1;
  } else {
    for (;;) {
      skipSpaces(parser);
      args.push(parseArgument(parser));
      skipSpaces(parser);
      const separator = parser.text[parser.i];
      parser.i += 1;
      if (separator === ')') break;
      if (separator !== ',') throw failure(`Expected ',' or ')' in '${parser.text}'`);
    }
  }

  const [min, max] = spec.arity;
  if (args.length < min || args.length > max) throw failure(`${name} received ${args.length} arguments`);
  return { kind: 'call', name, args };
}

function parseArgument(parser) {
  const rest = parser.text.slice(parser.i);
  if (rest.startsWith("'")) {
    let value = '';
    let j = 1;
    while (j < rest.length && rest[j] !== "'") {
      if (rest[j] === '\\' && j + 1 < rest.length) {
        const next = rest[j + 1];
        value += next === "'" || next === '\\' ? next : `\\${next}`;
        j += 2;
      } else {
        value += rest[j];
        j += 1;
      }
    }
    if (rest[j] !== "'") throw failure(`Unterminated string literal in '${parser.text}'`);
    parser.i += j + 1;
    return { kind: 'literal', value };
  }
  if (rest.startsWith('States.')) return parseCall(parser);
  if (rest.startsWith('$')) {
    let j = 0;
    let depth = 0;
    let quoted = false;
    while (j < rest.length) {
      const ch = rest[j];
      if (quoted) {
        if (ch === '\\') j += 1;
        else if (ch === "'") quoted = false;
      } else if (ch === "'") quoted = true;
      else if (ch === '[') depth += 1;
      else if (ch === ']') depth -= 1;
      else if (depth === 0 && (ch === ',' || ch === ')' || ch === ' ')) break;
      j += 1;
    }
    const expr = rest.slice(0, j);
    parsePath(expr);
    parser.i += j;
    return { kind: 'path', expr };
  }
  const literal = /^(-?\d+(?:\.\d+)?|true|false|null)/.exec(rest);
  if (literal) {
    parser.i += literal[0].length;
    return { kind: 'literal', value: JSON.parse(literal[0]) };
  }
  throw failure(`Unrecognized intrinsic argument at '${rest}'`);
}

/** Parses the value of a `.$` field: a JSONPath or an intrinsic function call. */
export function parseExpression(source) {
  const text = source.trim();
  if (text.startsWith('$')) {
    parsePath(text);
    return { kind: 'path', expr: text };
  }
  if (!text.startsWith('States.')) throw failure(`'${source}' is neither a JSONPath nor an intrinsic function`);
  const parser = { text, i: 0 };
  const node = parseCall(parser);
  skipSpaces(parser);
  if (parser.i !== text.length) throw failure(`Unexpected input after intrinsic call in '${source}'`);
  return node;
}

function evaluateNode(node, input, context) {
  if (node.kind === 'literal') return node.value;
  if (node.kind === 'path') return readPath(node.expr, input, context);
  const args = node.args.map((arg) => evaluateNode(arg, input, context));
  return INTRINSICS[node.name].run(args);
}

export function evaluateExpression(source, input, context) {
  return evaluateNode(parseExpression(source), input, context);
}

/** Applies a Parameters or ResultSelector payload template. */
export function applyPayloadTemplate(template, input, context) {
  if (Array.isArray(template)) return template.map((item) => applyPayloadTemplate(item, input, context));
  if (template === null || typeof template !== 'object') return template;
  const out = {};
  for (const [key, value] of Object.entries(template)) {
    if (key.endsWith('.$')) {
      if (typeof value !== 'string') throw new StatesError('States.Runtime', `Field '${key}' must be a string expression`);
      out[key.slice(0, -2)] = evaluateExpression(value, input, context);
    } else {
      out[key] = applyPayloadTemplate(value, input, context);
    }
  }
  return out;
}

/** Visits every `.$` expression in a payload template with its location. */
export function forEachExpression(template, visit, location = '') {
  if (Array.isArray(template)) {
    template.forEach((item, index) => forEachExpression(item, visit, `${location}[${index}]`));
    return;
  }
  if (template === null || typeof template !== 'object') return;
  for (const [key, value] of Object.entries(template)) {
    const at = `${location}/${key}`;
    if (key.endsWith('.$')) visit(value, at);
    else forEachExpression(value, visit, at);
  }
}

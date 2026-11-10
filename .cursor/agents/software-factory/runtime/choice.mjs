import { StatesError } from './errors.mjs';
import { pathExists, readPath } from './jsonpath.mjs';

const both = (type, test) => (a, b) => typeof a === type && typeof b === type && test(a, b);

function wildcard(pattern) {
  const pieces = pattern
    .split(/(?<!\\)\*/)
    .map((piece) => piece.replace(/\\\*/g, '*').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${pieces.join('.*')}$`, 's');
}

const COMPARATORS = {
  StringEquals: both('string', (a, b) => a === b),
  StringLessThan: both('string', (a, b) => a < b),
  StringGreaterThan: both('string', (a, b) => a > b),
  StringLessThanEquals: both('string', (a, b) => a <= b),
  StringGreaterThanEquals: both('string', (a, b) => a >= b),
  NumericEquals: both('number', (a, b) => a === b),
  NumericLessThan: both('number', (a, b) => a < b),
  NumericGreaterThan: both('number', (a, b) => a > b),
  NumericLessThanEquals: both('number', (a, b) => a <= b),
  NumericGreaterThanEquals: both('number', (a, b) => a >= b),
  BooleanEquals: both('boolean', (a, b) => a === b),
};

const TYPE_TESTS = {
  IsNull: (value) => value === null,
  IsString: (value) => typeof value === 'string',
  IsNumeric: (value) => typeof value === 'number',
  IsBoolean: (value) => typeof value === 'boolean',
};

export const CHOICE_OPERATORS = new Set([
  ...Object.keys(COMPARATORS),
  ...Object.keys(COMPARATORS).map((name) => `${name}Path`),
  'StringMatches',
  'IsPresent',
  ...Object.keys(TYPE_TESTS),
]);

export function operatorOf(rule) {
  const operators = Object.keys(rule).filter((key) => CHOICE_OPERATORS.has(key));
  if (operators.length !== 1) {
    throw new StatesError('States.Runtime', `Choice rule on '${rule.Variable}' must have exactly one comparison operator`);
  }
  return operators[0];
}

export function evaluateRule(rule, input, context) {
  if (rule.And) return rule.And.every((child) => evaluateRule(child, input, context));
  if (rule.Or) return rule.Or.some((child) => evaluateRule(child, input, context));
  if (rule.Not) return !evaluateRule(rule.Not, input, context);

  const operator = operatorOf(rule);
  if (operator === 'IsPresent') return pathExists(rule.Variable, input, context) === rule.IsPresent;

  const value = readPath(rule.Variable, input, context);
  if (operator in TYPE_TESTS) return TYPE_TESTS[operator](value) === rule[operator];
  if (operator === 'StringMatches') return typeof value === 'string' && wildcard(rule.StringMatches).test(value);
  if (operator.endsWith('Path')) {
    const compare = COMPARATORS[operator.slice(0, -'Path'.length)];
    return compare(value, readPath(rule[operator], input, context));
  }
  return COMPARATORS[operator](value, rule[operator]);
}

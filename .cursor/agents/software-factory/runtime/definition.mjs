import { CHOICE_OPERATORS } from './choice.mjs';
import { forEachExpression, parseExpression } from './intrinsics.mjs';
import { parsePath } from './jsonpath.mjs';

const TOP_LEVEL_FIELDS = new Set(['Comment', 'StartAt', 'States', 'Version', 'QueryLanguage']);
const COMMON_FIELDS = ['Type', 'Comment'];
const STATE_FIELDS = {
  Pass: [...COMMON_FIELDS, 'Next', 'End', 'InputPath', 'OutputPath', 'Parameters', 'Result', 'ResultPath'],
  Task: [
    ...COMMON_FIELDS,
    'Next',
    'End',
    'InputPath',
    'OutputPath',
    'Parameters',
    'ResultSelector',
    'ResultPath',
    'Resource',
    'Retry',
    'Catch',
    'TimeoutSeconds',
    'HeartbeatSeconds',
  ],
  Choice: [...COMMON_FIELDS, 'Choices', 'Default', 'InputPath', 'OutputPath'],
  Succeed: [...COMMON_FIELDS, 'InputPath', 'OutputPath'],
  Fail: [...COMMON_FIELDS, 'Error', 'ErrorPath', 'Cause', 'CausePath'],
};
const RETRY_FIELDS = new Set(['ErrorEquals', 'IntervalSeconds', 'MaxAttempts', 'BackoffRate']);
const CATCH_FIELDS = new Set(['ErrorEquals', 'Next', 'ResultPath']);
const RESOURCE_PLACEHOLDER = /^\$\{([A-Za-z0-9_]+)\}$/;

export const resourcePlaceholder = (resource) => RESOURCE_PLACEHOLDER.exec(resource ?? '')?.[1] ?? null;

/**
 * Validates a definition against the ASL subset this runtime executes.
 * Returns diagnostics shaped like the ValidateStateMachineDefinition API.
 */
export function validateDefinition(definition, resourceNames) {
  const diagnostics = [];
  const report = (code, message, location) => diagnostics.push({ severity: 'ERROR', code, message, location });

  if (definition === null || typeof definition !== 'object' || Array.isArray(definition)) {
    report('INVALID_JSON_DESCRIPTION', 'Definition must be a JSON object', '/');
    return diagnostics;
  }
  for (const key of Object.keys(definition)) {
    if (!TOP_LEVEL_FIELDS.has(key)) report('SCHEMA_VALIDATION_FAILED', `Field '${key}' is not supported by the local runtime`, `/${key}`);
  }
  if (definition.QueryLanguage !== undefined && definition.QueryLanguage !== 'JSONPath') {
    report('SCHEMA_VALIDATION_FAILED', 'Only the JSONPath query language is supported', '/QueryLanguage');
  }
  const states = definition.States;
  if (states === null || typeof states !== 'object' || Object.keys(states).length === 0) {
    report('SCHEMA_VALIDATION_FAILED', 'States must be a non-empty object', '/States');
    return diagnostics;
  }
  if (!Object.hasOwn(states, definition.StartAt ?? '')) {
    report('MISSING_TRANSITION_TARGET', `StartAt '${definition.StartAt}' is not a state`, '/StartAt');
  }

  const checkTarget = (target, location) => {
    if (typeof target !== 'string' || !Object.hasOwn(states, target)) {
      report('MISSING_TRANSITION_TARGET', `Transition target '${target}' is not a state`, location);
    }
  };
  const checkPath = (value, location) => {
    if (value === null || value === undefined) return;
    try {
      parsePath(value);
    } catch (error) {
      report('INVALID_JSON_PATH', error.message, location);
    }
  };
  const checkTemplate = (template, location) => {
    forEachExpression(template, (expression, at) => {
      try {
        if (typeof expression !== 'string') throw new Error('Expression must be a string');
        parseExpression(expression);
      } catch (error) {
        report('INVALID_JSON_PATH', error.message, `${location}${at}`);
      }
    });
  };
  const checkErrorList = (list, location) => {
    if (!Array.isArray(list) || list.length === 0 || list.some((name) => typeof name !== 'string')) {
      report('SCHEMA_VALIDATION_FAILED', 'ErrorEquals must be a non-empty array of strings', location);
      return;
    }
    if (list.includes('States.ALL') && list.length > 1) {
      report('SCHEMA_VALIDATION_FAILED', 'States.ALL must appear alone in ErrorEquals', location);
    }
  };
  const checkRule = (rule, location, topLevel) => {
    if (rule === null || typeof rule !== 'object') {
      report('SCHEMA_VALIDATION_FAILED', 'Choice rule must be an object', location);
      return;
    }
    if (topLevel) checkTarget(rule.Next, `${location}/Next`);
    else if (rule.Next !== undefined) report('SCHEMA_VALIDATION_FAILED', 'Nested choice rules cannot have Next', location);

    if (rule.And || rule.Or) {
      const children = rule.And ?? rule.Or;
      if (!Array.isArray(children) || children.length === 0) {
        report('SCHEMA_VALIDATION_FAILED', 'And/Or must be a non-empty array', location);
        return;
      }
      children.forEach((child, index) => checkRule(child, `${location}/${rule.And ? 'And' : 'Or'}[${index}]`, false));
      return;
    }
    if (rule.Not) {
      checkRule(rule.Not, `${location}/Not`, false);
      return;
    }
    checkPath(rule.Variable, `${location}/Variable`);
    const operators = Object.keys(rule).filter((key) => CHOICE_OPERATORS.has(key));
    if (operators.length !== 1) {
      report('SCHEMA_VALIDATION_FAILED', 'Choice rule must have exactly one comparison operator', location);
    } else if (operators[0].endsWith('Path')) {
      checkPath(rule[operators[0]], `${location}/${operators[0]}`);
    }
    const extra = Object.keys(rule).filter((key) => !CHOICE_OPERATORS.has(key) && !['Variable', 'Next', 'Comment'].includes(key));
    for (const key of extra) report('SCHEMA_VALIDATION_FAILED', `Choice rule field '${key}' is not supported`, location);
  };

  for (const [name, state] of Object.entries(states)) {
    const at = `/States/${name}`;
    const allowed = STATE_FIELDS[state?.Type];
    if (!allowed) {
      report('SCHEMA_VALIDATION_FAILED', `State type '${state?.Type}' is not supported by the local runtime`, `${at}/Type`);
      continue;
    }
    for (const key of Object.keys(state)) {
      if (!allowed.includes(key)) report('SCHEMA_VALIDATION_FAILED', `Field '${key}' is not supported on ${state.Type} states`, `${at}/${key}`);
    }
    if (state.Type === 'Pass' || state.Type === 'Task') {
      if ((state.Next === undefined) === (state.End !== true)) {
        report('SCHEMA_VALIDATION_FAILED', 'State must have exactly one of Next or End: true', at);
      }
      if (state.Next !== undefined) checkTarget(state.Next, `${at}/Next`);
    }
    for (const field of ['InputPath', 'OutputPath', 'ResultPath', 'ErrorPath', 'CausePath']) checkPath(state[field], `${at}/${field}`);
    if (state.Parameters !== undefined) checkTemplate(state.Parameters, `${at}/Parameters`);
    if (state.ResultSelector !== undefined) checkTemplate(state.ResultSelector, `${at}/ResultSelector`);

    if (state.Type === 'Task') {
      const placeholder = resourcePlaceholder(state.Resource);
      if (!placeholder) report('SCHEMA_VALIDATION_FAILED', "Resource must be a '${Name}' placeholder", `${at}/Resource`);
      else if (!resourceNames.has(placeholder)) report('SCHEMA_VALIDATION_FAILED', `Resource '${placeholder}' has no local mapping`, `${at}/Resource`);
      for (const field of ['TimeoutSeconds', 'HeartbeatSeconds']) {
        if (state[field] !== undefined && !(Number.isInteger(state[field]) && state[field] > 0)) {
          report('SCHEMA_VALIDATION_FAILED', `${field} must be a positive integer`, `${at}/${field}`);
        }
      }
      (state.Retry ?? []).forEach((retrier, index) => {
        const where = `${at}/Retry[${index}]`;
        checkErrorList(retrier.ErrorEquals, `${where}/ErrorEquals`);
        for (const key of Object.keys(retrier)) {
          if (!RETRY_FIELDS.has(key)) report('SCHEMA_VALIDATION_FAILED', `Retry field '${key}' is not supported`, where);
        }
      });
      (state.Catch ?? []).forEach((catcher, index) => {
        const where = `${at}/Catch[${index}]`;
        checkErrorList(catcher.ErrorEquals, `${where}/ErrorEquals`);
        checkTarget(catcher.Next, `${where}/Next`);
        checkPath(catcher.ResultPath, `${where}/ResultPath`);
        for (const key of Object.keys(catcher)) {
          if (!CATCH_FIELDS.has(key)) report('SCHEMA_VALIDATION_FAILED', `Catch field '${key}' is not supported`, where);
        }
      });
    }
    if (state.Type === 'Choice') {
      if (!Array.isArray(state.Choices) || state.Choices.length === 0) {
        report('SCHEMA_VALIDATION_FAILED', 'Choices must be a non-empty array', `${at}/Choices`);
      } else {
        state.Choices.forEach((rule, index) => checkRule(rule, `${at}/Choices[${index}]`, true));
      }
      if (state.Default !== undefined) checkTarget(state.Default, `${at}/Default`);
    }
    if (state.Type === 'Fail') {
      if (state.Error !== undefined && state.ErrorPath !== undefined) report('SCHEMA_VALIDATION_FAILED', 'Use Error or ErrorPath, not both', at);
      if (state.Cause !== undefined && state.CausePath !== undefined) report('SCHEMA_VALIDATION_FAILED', 'Use Cause or CausePath, not both', at);
    }
  }

  const reachable = new Set();
  const queue = Object.hasOwn(states, definition.StartAt ?? '') ? [definition.StartAt] : [];
  while (queue.length > 0) {
    const name = queue.shift();
    if (reachable.has(name) || !Object.hasOwn(states, name)) continue;
    reachable.add(name);
    const state = states[name];
    const targets = [state.Next, state.Default, ...(state.Choices ?? []).map((rule) => rule?.Next), ...(state.Catch ?? []).map((c) => c?.Next)];
    queue.push(...targets.filter((target) => typeof target === 'string'));
  }
  for (const name of Object.keys(states)) {
    if (!reachable.has(name)) report('UNREACHABLE_STATE', `State '${name}' is not reachable from StartAt`, `/States/${name}`);
  }
  return diagnostics;
}

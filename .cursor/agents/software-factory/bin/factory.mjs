#!/usr/bin/env node
import fs from 'node:fs';
import { ServiceError } from '../runtime/errors.mjs';
import { loadFactory } from '../runtime/factory.mjs';

class UsageError extends Error {}

const required = (flags, name) => {
  const value = flags[name];
  if (typeof value !== 'string' || value === '') throw new UsageError(`--${name} is required`);
  return value;
};
const optional = (flags, name) => (typeof flags[name] === 'string' ? flags[name] : undefined);

const COMMANDS = {
  'start-execution': {
    operation: 'StartExecution',
    usage: "--input '<json>' [--name <execution-name>]",
    run: ({ states }, flags) => states.startExecution({ input: optional(flags, 'input') ?? '{}', name: optional(flags, 'name') }),
  },
  'describe-execution': {
    operation: 'DescribeExecution',
    usage: '--execution-arn <arn|name>',
    run: ({ states }, flags) => states.describeExecution({ executionArn: required(flags, 'execution-arn') }),
  },
  'list-executions': {
    operation: 'ListExecutions',
    usage: '[--status-filter RUNNING|SUCCEEDED|FAILED|TIMED_OUT|ABORTED]',
    run: ({ states }, flags) => states.listExecutions({ statusFilter: optional(flags, 'status-filter') }),
  },
  'get-execution-history': {
    operation: 'GetExecutionHistory',
    usage: '--execution-arn <arn|name> [--reverse-order]',
    run: ({ states }, flags) =>
      states.getExecutionHistory({ executionArn: required(flags, 'execution-arn'), reverseOrder: flags['reverse-order'] === true }),
  },
  'stop-execution': {
    operation: 'StopExecution',
    usage: '--execution-arn <arn|name> [--error <code>] [--cause <text>]',
    run: ({ states }, flags) =>
      states.stopExecution({ executionArn: required(flags, 'execution-arn'), error: optional(flags, 'error'), cause: optional(flags, 'cause') }),
  },
  'list-activities': {
    operation: 'ListActivities',
    usage: '',
    run: ({ states }) => states.listActivities(),
  },
  'get-activity-task': {
    operation: 'GetActivityTask',
    usage: '--activity-arn <arn|name> [--worker-name <name>]',
    run: ({ states }, flags) => states.getActivityTask({ activityArn: required(flags, 'activity-arn'), workerName: optional(flags, 'worker-name') }),
  },
  'send-task-success': {
    operation: 'SendTaskSuccess',
    usage: "--task-token <token> --task-output '<json>'",
    run: ({ states }, flags) => states.sendTaskSuccess({ taskToken: required(flags, 'task-token'), output: required(flags, 'task-output') }),
  },
  'send-task-failure': {
    operation: 'SendTaskFailure',
    usage: '--task-token <token> [--error <code>] [--cause <text>]',
    run: ({ states }, flags) =>
      states.sendTaskFailure({ taskToken: required(flags, 'task-token'), error: optional(flags, 'error'), cause: optional(flags, 'cause') }),
  },
  'list-activity-tasks': {
    operation: 'ListActivityTasks',
    usage: '(local only)',
    run: ({ states }) => states.listActivityTasks(),
  },
  'validate-state-machine-definition': {
    operation: 'ValidateStateMachineDefinition',
    usage: '(validates statemachine/factory.asl.json, resources, and config)',
    run: async ({ validate }) => {
      const diagnostics = validate();
      return { result: diagnostics.length === 0 ? 'OK' : 'FAIL', diagnostics };
    },
  },
};

function parseFlags(args) {
  const flags = {};
  const readValue = (value) => (value.startsWith('file://') ? fs.readFileSync(value.slice('file://'.length), 'utf8') : value);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) throw new UsageError(`Unexpected argument '${arg}'`);
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      flags[arg.slice(2, eq)] = readValue(arg.slice(eq + 1));
      continue;
    }
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[arg.slice(2)] = true;
    } else {
      flags[arg.slice(2)] = readValue(next);
      i += 1;
    }
  }
  return flags;
}

function usage() {
  const lines = Object.entries(COMMANDS).map(([name, command]) => `  ${name} ${command.usage}`.trimEnd());
  return `usage: node factory.mjs <command> [flags]\n\nCommands (mirror 'aws stepfunctions'):\n${lines.join('\n')}\n\nFlag values may use file://path.\n`;
}

async function main() {
  const [name, ...args] = process.argv.slice(2);
  if (!name || name === 'help' || name === '--help') {
    process.stdout.write(usage());
    return;
  }
  const command = COMMANDS[name];
  if (!command) throw new UsageError(`Unknown command '${name}'`);
  const flags = parseFlags(args);
  try {
    const result = await command.run(loadFactory(), flags);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result?.result === 'FAIL') process.exitCode = 1;
  } catch (error) {
    if (error instanceof ServiceError) {
      process.stderr.write(`\nAn error occurred (${error.code}) when calling the ${command.operation} operation: ${error.message}\n`);
      process.exit(254);
    }
    throw error;
  }
}

main().catch((error) => {
  if (error instanceof UsageError) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exit(252);
  }
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exit(255);
});

---
name: software-factory
description: "Spec-first software factory on a local Step Functions runtime. forward: feature → PRD → human review loop → flow lock → prototype → code → verify. reverse: repo → 7 analysis stages → PRD → same path. refine: revise a committed PRD. Use for 'factory', 'build X spec-first', 'write a PRD for', 'reverse-engineer this repo'."
argument-hint: "[forward <feature> | reverse <dir> | refine <slug>] [scope: prd | prototype | full]"
user-invocable: true
disable-model-invocation: true
---
# Software factory

You are the activity worker pool for a state machine. The state machine, not you, decides what happens next. Your job is to poll for work, do the one task each activity hands you, and report the result.

`FACTORY` below means the folder containing this file. Run every command from the repository root:

```bash
node FACTORY/bin/factory.mjs <command> [flags]
```

The commands mirror `aws stepfunctions`. Run `node FACTORY/bin/factory.mjs help` for the list.

## 1. Start

Infer the input from the user's message and state it in one line before starting:

| Field | Value |
| --- | --- |
| `mode` | `forward` (new feature), `reverse` (existing code), or `refine` (revise a committed PRD) |
| `slug` | Kebab-case product name, reused across runs of the same product |
| `feature` | forward only: the user's request, verbatim |
| `repo` | reverse only: directory to analyze, relative to the repo root |
| `scope` | `prd`, `prototype`, or `full` (default) |
| `context` | Optional extra repo-relative docs the user @-mentioned |

```bash
node FACTORY/bin/factory.mjs start-execution --name <slug>-<yyyymmdd-hhmmss> --input '<json>'
```

If the result's `local.status` is `FAILED`, run `describe-execution` and report its `error` and `cause`. `Factory.InvalidInput` lists exactly what to fix.

## 2. Work loop

Repeat until the execution is no longer `RUNNING`:

1. `list-activity-tasks` shows the pending task, its activity, and its decoded input (the brief).
2. Claim it: `get-activity-task --activity-arn <activityArn> --worker-name cursor-agent`. Use the returned `taskToken`.
3. Read the brief's `guide` (a path relative to the repo root) and follow it exactly. The guide defines the brief's fields and the task output. Store keys in the brief resolve under `storeRoot`.
4. Report back:
   - Done: `send-task-success --task-token <token> --task-output '<json>'`
   - Cannot do it (missing access, the human stops): `send-task-failure --task-token <token> --error Factory.WorkerFailed --cause '<why>'`
5. The response's `local` shows the next state. A brief with a non-null `validationFeedback` means a validator rejected your last proposal; fix every listed problem before resubmitting.

For long JSON output, write it to a temp file and pass `--task-output file:///abs/path.json`.

## 3. Human review

`HumanReview` tasks are the gate. Follow `workers/human-review.md`: summarize the PRD, ask the human with AskQuestion, and relay their answer verbatim. Never approve for them. While waiting, the execution stays `RUNNING` (up to 7 days), so you can stop and resume in a later chat with `list-activity-tasks`.

## 4. Finish

When `describe-execution` reports `SUCCEEDED`, its `output` is the final `run` record. Report:

- PRD version and key, and whether the flow is locked
- Prototype key, if built
- Implementation report and verify status (`passed`, `not-run`, or `not-configured`)

Product artifacts live under the configured `artifactRoot` at `products/<slug>/`: `manifest.json`, `prd/v*.md`, `analysis/`, `prototype/`, `implementation/`, and `runs/`.

## Rules

- Never edit committed artifacts (`products/<slug>/…`) or files under `executionRoot`. Write only where the brief's `outputKey`, `outputPrefix`, or `reportKey` points, plus `codeRoots` for Implement.
- Never skip or reorder states, and never call `send-task-success` for work you did not do.
- Delegate heavy roles (reverse analysis stages, Implement) to a Task subagent with the brief and guide path. Keep the CLI loop in this chat.
- One running execution per slug. To abandon a run: `stop-execution --execution-arn <name>`.
- `validate-state-machine-definition` checks the definition, resource map, and config after any edit to `statemachine/` or `factory.config.json`.

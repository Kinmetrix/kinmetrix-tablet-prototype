# software-factory

Feature text or existing code goes through a fixed pipeline: PRD, you approve it, optional HTML prototype, code in `codeRoots`, optional verify command. A state machine picks the next step. Agents only draft. Node functions validate and commit. Nothing runs between CLI calls except inside those calls.

**Use it in Cursor.** Invoke the `software-factory` skill. Example: `forward: CSV export on the reports page, scope prd`. The agent runs the CLI loop in `SKILL.md`. You only have to answer at PRD review.

| Mode | Input |
| --- | --- |
| `forward` | `feature` (plain language) |
| `reverse` | `repo` (path to code) |
| `refine` | Existing `slug` with a committed PRD |

| Scope | Stops after |
| --- | --- |
| `prd` | You approve and the flow locks |
| `prototype` | Clickable HTML is committed |
| `full` | Implement; verify runs only if `verify.command` is set (default scope) |

## Prompt examples

Invoke the `software-factory` skill (or say "use software factory"). The agent infers `mode`, `slug`, and `scope`. Reuse the same **slug** for one product across runs. @-mention docs to add them to `context` for that run.

```text
/software-factory forward: users pick a plan before starting a workflow. Slug plan-select. Scope prd.
```
PRD only. Stops after you approve and the flow locks.

```text
/software-factory Build side-by-side report comparison on the reports page. Slug report-compare. Full scope.
```
PRD, review, prototype, code, then verify if configured in `factory.local.json`.

```text
/software-factory forward: empty state when a user has no plans yet. Slug plan-select. Scope prototype.
```
Stops after committed HTML prototype. Good after the PRD for `plan-select` is already approved.

```text
/software-factory reverse-engineer src/features/home-shell into a PRD. Slug home-shell. Scope prd.
```
Seven analysis stages on that directory, then a synthesized PRD and review.

```text
/software-factory reverse: src/features/reports. Slug report-detail. Stop at prd.
```
Same as reverse with an explicit repo path and scope.

```text
/software-factory refine plan-select. I will answer the open questions at review.
```
New run on the latest committed PRD for that slug. Use after `maxRefineRounds` or when you only want another review pass.

```text
/software-factory refine report-compare and take it to full scope. Match @prototype/docs/product.md.
```
Revision loop, then prototype, implement, and verify. Extra doc goes in `context`.

```text
/software-factory What's pending on plan-select? Resume the human review.
```
No new execution. Agent uses `list-activity-tasks` and continues where the run paused.

```text
/software-factory forward: greenfield habit tracker (Vite, React, yarn). Slug pt-habits. Scope prd. New repo.
```
Tells the agent to treat this as a new product. Copy the factory folder and `factory.local.json` in that repo first.

```text
/software-factory forward: CSV export on reports. Use @image-prototypes/plan-select for layout tone. Slug report-export. Scope prototype.
```
Visual reference is context only. Prototype worker still writes static HTML under staging.

## New repo (copy paste)

Node 18+. No install step. Git strongly recommended (stray-file checks without it are weak).

```bash
mkdir -p .cursor/agents
rsync -a --exclude factory.local.json SOURCE/.cursor/agents/software-factory/ .cursor/agents/software-factory/
cp .cursor/agents/software-factory/factory.local.example.json .cursor/agents/software-factory/factory.local.json
# Edit factory.local.json: context paths, codeRoots, verify.command (or null)
node .cursor/agents/software-factory/bin/factory.mjs validate-state-machine-definition
```

`validate` fails until every `context` path exists. It does **not** sanity-check `codeRoots` or `verify.command`. Fill those before a `full` run.

Repo root: `FACTORY_REPO_ROOT`, else nearest `.git` above this folder, else `git rev-parse`, else cwd.

## Config (factory.local.json)

Copy from `factory.local.example.json`. Merges over `factory.config.json` (objects merge, arrays replace).

| Key | You care because |
| --- | --- |
| `context` | Docs every agent reads first |
| `codeRoots` | Only paths Implement may touch |
| `verify.command` | Shell from repo root after Implement; `null` skips |
| `artifactRoot` / `executionRoot` | Where products and run history live (defaults under `factory/`) |
| `limits.maxRejections` | Bad drafts per role/stage before run dies (default 3) |
| `limits.maxRefineRounds` | Review loops per run (default 5); then start `refine` mode |

Full key list and defaults: `factory.config.json`.

## Where output goes

`<artifactRoot>/products/<slug>/`: `manifest.json`, `prd/v1.0.md` (immutable versions), `prototype/`, `implementation/`, `runs/`. Staging drafts live under `staging/<execution>/` and are not the source of truth.

First PRD is always `1.0`. Forward/reverse bumps major; refine bumps minor.

## Gotchas

- One `RUNNING` execution per slug (`Factory.ProductBusy`).
- You must approve PRD at `HumanReview`. Agent will not approve for you.
- Implement needs flow-locked PRD. Prototype/code before approval will not pass validators.
- Rejected draft loops back with `validationFeedback`. Fix the list or hit rejection limit.
- Factory never runs `git commit`. You own history.

## Flow (one line)

`InitRun` → forward **AuthorPrd** | reverse **7× analysis → SynthesizePrd** | refine **ReviewPrd** → **ReviewPrd** loop → **LockFlow** → optional **Prototype** → optional **Implement** → optional **Verify** (fail → Implement) → **Done**. Scope cuts the tail early.

Validators named `Validate*`; bad proposals throw `Factory.ProposalInvalid` and retry the same activity.

## CLI (when you debug, not day to day)

From repo root:

```bash
node .cursor/agents/software-factory/bin/factory.mjs help
node .cursor/agents/software-factory/bin/factory.mjs list-activity-tasks
node .cursor/agents/software-factory/bin/factory.mjs describe-execution --execution-arn <name>
node .cursor/agents/software-factory/bin/factory.mjs stop-execution --execution-arn <name>
```

Start manually:

```bash
node .cursor/agents/software-factory/bin/factory.mjs start-execution \
  --name myslug-$(date +%Y%m%d-%H%M%S) \
  --input '{"mode":"forward","slug":"myslug","feature":"..."}'
```

Exit codes: `0` ok, `1` validate failed, `252` usage, `254` service (`describe-execution` for `error`/`cause`), `255` other.

## Layout

| Path | Role |
| --- | --- |
| `SKILL.md` | Operator loop for the Cursor agent |
| `statemachine/` | ASL definition + local resource map |
| `functions/` | Validators and commit handlers |
| `workers/` | Per-activity agent instructions |
| `bin/factory.mjs` | Local Step Functions CLI |
| `runtime/` | Interpreter and store |

## AWS

Same ASL shape as Step Functions: activities for agents, Lambdas for validators, S3-shaped keys under `artifactRoot`. Local-only: `list-activity-tasks`, bare names instead of ARNs, no daemon (work happens inside CLI calls). On AWS, `Verify` becomes CodeBuild, not Lambda. No deploy template in this folder.

## Tests

```bash
node --test .cursor/agents/software-factory/test/*.test.mjs
```

E2e needs git and runs outside sandboxes that block `.cursor/` in temp dirs.

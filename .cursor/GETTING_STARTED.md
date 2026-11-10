# Getting started

Copy this `.cursor` folder into a project, then fix paths for that project.

## 1. Software factory (PRD → prototype → code)

Create your local settings file:

```bash
cp .cursor/agents/software-factory/factory.local.example.json \
   .cursor/agents/software-factory/factory.local.json
```

Edit `factory.local.json`:

| Setting | What to put |
| --- | --- |
| `codeRoots` | Folders where generated code is allowed to land |
| `context` | Files the agents should read up front (must exist on disk). Often just `AGENTS.md` at first. |
| `verify.command` | Command to run a quick check after code is written, or `null` to skip |
| `artifactRoot` / `executionRoot` | Usually leave as `factory/...` |

Check the config:

```bash
node .cursor/agents/software-factory/bin/factory.mjs validate-state-machine-definition
```

In Cursor, use the **software-factory** skill. More examples: `agents/software-factory/README.md`.

Use **git** in the project if you can. The factory uses it to see which files changed.

## 2. Commands and rules

Some slash commands point at files you may not have copied (extra rules, shared notes, `workflow.json`). Add those files or edit the command so paths match your repo.

Find references:

```bash
rg '\.cursor/(shared|rules)/|workflow\.json' .cursor/commands
```

## 3. Repo map

Add `AGENTS.md` at the repo root and list it in `context` until you add more docs under your app (for example `prototype/docs/`).

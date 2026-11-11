---
name: verify-kinmetrix
description: >-
  Drive the Kinmetrix clinic shared-iPad HTML prototype (static web UI under
  prototype/) with Playwright: launch an isolated serve instance, doctor it,
  click real routes, and capture proof. Use when proving HTML flows, journeys,
  or UI changes in kinmetrix-tablet-prototype — not for native RN visual-compare
  (that is kinmetrix-visual-compare).
---

# Verify Kinmetrix (HTML prototype)

Primary surface: **static HTML tablet UI** in `prototype/` (landscape station, logical **1180×820**). No API, no auth gate, fixture copy only. Secondary surfaces (do not use this skill for them): native RN on Kinmetrix IPad (`kinmetrix-visual-compare`), factory PRDs under `factory/`.

Harness binary (always invoke this; do not reinvent serve/Playwright one-offs):

```bash
node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs <command> [...]
```

Optional isolation: `KINMETRIX_VERIFY_RUN_ID=<id>` and/or `KINMETRIX_VERIFY_PORT=<port>` (default port **5174**, so it does not collide with a human `yarn dev` on **5173**). State file: `/tmp/kinmetrix-verify-$RUN_ID.json` (default run id `default`).

Read `features/README.md` before driving. Use the matching feature file as the recipe.

## Launch

From repo root (or any cwd — the helper resolves `prototype/`):

```bash
export KINMETRIX_VERIFY_RUN_ID="${KINMETRIX_VERIFY_RUN_ID:-$(date +%s)}"
node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs launch
# optional: ... launch --port 5175
```

Ready means `GET http://127.0.0.1:$PORT/home.html` becomes usable after following `serve` clean-URL redirects (often `/home.html` → `/home`) with body containing both `data-route="Home"` and `device-frame` — not merely that the port accepts TCP. The helper blocks until that is true, then prints JSON with `baseUrl`, `pid`, and `statePath`.

Teardown (after evidence is written):

```bash
node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs cleanup
```

Cleanup kills **only** the pid recorded in the state file and deletes that state file. It never deletes proof under `.cursor/skills/verify-kinmetrix/artifacts/`.

**Do not** drive a shared `yarn dev` / port 5173 instance you did not start. If port 5174 is taken, choose another port with `--port` / `KINMETRIX_VERIFY_PORT`, or a new `KINMETRIX_VERIFY_RUN_ID` on a free port. Two verify instances may run side by side on different ports and run ids.

Deps: `prototype/` must have `yarn` install (Playwright). First Chromium use may need `cd prototype && npx playwright install chromium`.

## Doctor

Whenever anything looks off, before continuing a drive:

```bash
node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs doctor
```

Pass only if: state file exists, recorded pid is alive, `home.html` is usable, and the answering server is the one this run launched (`ownedByUs`). Exit code non-zero otherwise — stop and relaunch rather than clicking someone else's session.

## Drive

Stateful session: each command reopens Chromium at `lastPath` from the state file, acts, then saves the new path.

| Command | Purpose |
| --- | --- |
| `goto <page.html>` | Open a route file (e.g. `login.html`) |
| `click --role link --name "Get Started"` | Click by ARIA role + accessible name (regex, case-insensitive) |
| `click --role button --name "Log In"` | Same for buttons |
| `click --selector "a.wire-btn--primary"` | Escape hatch when name is ambiguous |
| `fill --label "Email Address" --value "..."` | Fill labeled field |
| `fill --id identifier --value "..."` | Fill by input id |
| `assert-route Home` | Require `body[data-route]` |
| `assert-text "Select Exercise Type"` | Require visible text |
| `snapshot --path sign-in/after-login.json` | Write route/title/links/aria text under `artifacts/` |
| `screenshot --path sign-in/after-login.png` | Clip `.device-frame` to 1180×820 under `artifacts/` |

Stable handles in this repo:

- Route identity: `body[data-route="…"]` (matches `screens.json` route names).
- Device canvas: `.device-frame`.
- App chrome: `.wire-toolbar`, `.wire-toolbar-back`, `.wire-btn--primary`.
- Login: link **Get Started** → `password-login.html`; form labels **Email Address** / **Password**; button **Log In** → `home.html`.
- Member home: link whose name matches **Start** (`▶ Start`) → `home-start.html`.
- Team roster: table `aria-label="Team members"`; member name links to `team-user.html`.
- Programs: table `aria-label="Programs"`; link **+ Create New**.

Prefer `--role` / `--name` and `assert-route` over coordinates. Prefer toolbar / in-canvas controls over the debug `screen-header` and over `flow-nav` shortcuts unless the feature file says the shortcut is an allowed entry point.

Feature recipes live in `features/`. Do not invent alternate entry points and call the feature verified.

## Evidence

Proof root: `.cursor/skills/verify-kinmetrix/artifacts/<feature-or-run>/`.

Standards:

- Exercise the **user path** (links and buttons a clinician would tap). Do not “prove” by only opening the destination HTML URL unless the feature file lists that as an entry point.
- Capture **action + result**: snapshot/screenshot before the critical click when useful, and always after the resulting screen settles (`assert-route` / `assert-text` plus `snapshot` + `screenshot`).
- Side effects: this prototype does not persist; proof is navigational and visual (route, toolbar title, fixture copy). Do not claim DB/API writes.
- Mocks: N/A beyond fixture HTML already in-repo. Never treat visual-compare RN tiles as HTML proof.
- Record the feature id and entry point in the artifact folder name or alongside the JSON snapshot.

## Cleanup

```bash
node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs cleanup
```

After failed iterations, run cleanup before the next launch so ports and state files are not stranded. Re-check that evidence files still exist under `artifacts/` after cleanup.

## Helpers

```bash
# Launch isolated serve (default :5174)
KINMETRIX_VERIFY_RUN_ID=demo node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs launch

# Health
KINMETRIX_VERIFY_RUN_ID=demo node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs doctor

# Example click
KINMETRIX_VERIFY_RUN_ID=demo node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs click --role link --name "Get Started"

# Tear down process only
KINMETRIX_VERIFY_RUN_ID=demo node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs cleanup
```

The helper is executable via `node …/verify-kinmetrix.mjs`. It loads Playwright from `prototype/node_modules`.

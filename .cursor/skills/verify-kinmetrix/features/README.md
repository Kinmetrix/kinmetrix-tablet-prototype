# Kinmetrix HTML prototype verification map

Maintained source for verifying user-facing behavior of the static tablet UI under `prototype/`. Read this index before driving, then use the matching feature file.

## Baseline preconditions

- Launch with `node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs launch` (default `http://127.0.0.1:5174`).
- Set `KINMETRIX_VERIFY_RUN_ID` so concurrent runs do not share `/tmp/kinmetrix-verify-*.json`.
- Run `… doctor` and require `ownedByUs: true` and `homeUsable: true`.
- Never drive an instance that was not started by this verification run (including a human `yarn dev` on 5173).
- Fixture data is baked into the HTML. There is no seed step and no disposable data directory.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise (`goto` the starting page).
- Prefer ARIA roles and accessible names; fall back to `body[data-route]` and labeled fields.
- Treat every harness command as literal.
- Restore is unnecessary for mutations (no persistence). Cleanup only stops the serve process.
- Keep proof under `.cursor/skills/verify-kinmetrix/artifacts/`.

## Proof and skip reporting

- Capture the user action and the resulting state (`assert-route` / `assert-text` plus `snapshot` and `screenshot`).
- UI proof includes a JSON snapshot (route, title, links, aria text) and a 1180×820 device-frame screenshot.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.
- Placeholder hardware/legal screens (`device-calibration`, `exercise`, waiver) are layout stubs — verify navigation into them only when a feature file says so; do not invent live-device success criteria.

## Feature entry contract

Each feature file starts with an H1 and one paragraph, then exactly these H2s: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-kinmetrix`, `Gotchas`.

## Features

- [Sign in (layout)](./sign-in-layout.md) — login landing through password form into member home.
- [Member start session](./member-start-session.md) — home analysis → Start → exercise-type choices.
- [Team roster to member](./team-roster.md) — team home roster into a member profile path.
- [Programs list](./programs-list.md) — open programs from Start and inspect the list / create entry.
- [Session history](./session-history.md) — home history affordance into session history.

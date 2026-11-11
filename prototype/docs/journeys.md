# Primary journeys

Happy paths reviewers and PMs walk in the HTML prototype. Open links from `prototype/` with `yarn dev`.

## 1. Sign in (layout only)

`login.html` → `password-login.html` → hubs (`team-home.html` or `home.html`)

No auth gate. Index also jumps straight into hubs.

## 2. Team roster → member

`team-home.html` → `team-user.html` → member `home.html`

Compare path: `team-user.html` → `compare-team-user-sessions.html` → `compare-team-user-sessions-detail.html`

## 3. Member session day

`home.html` → `home-start.html` → assessment or program

- Assessment: `assessment.html` → `create-protocol-session.html` / `protocol-preview.html` → placeholders for live run
- Training: `program-list.html` → `group-list.html` → `run-group.html` → `exercise.html` (placeholder) → `group-results.html` / `session-history.html`
- Warmup routes are not mirrored; links that would open Warmup / WarmupType go to `exercise.html` instead.

## 4. Programs and groups (edit)

`program-list.html` → `add-program.html` / `edit-program.html` → `add-group.html` / `edit-group.html` → `add-step.html`

Create from template: `create-program-choice.html` → `select-program-template.html`

## 5. History, analysis, compare

`session-history.html` → `session-data.html` / `user-analysis-details.html`

Member compare: `compare-session.html` · Team compare: journey 2

## 6. Team settings and templates

`team-settings.html` → `team-settings-home.html`

- Roster: `team-user-list.html` → `add-team-user.html` / `team-user-details.html`
- Templates: `program-template-list.html`, `group-template-list.html`, `step-template-list.html`, `team-session-template-list.html`
- Create/edit: matching `add-*-template.html` / `edit-*-template.html` / `create-team-session-template.html`

## 7. Onboarding a member

`onboarding.html` → preference → step screens (`onboarding-name.html` … `onboarding-onboarding-confirmation.html`)

## Placeholders (hardware / legal)

Treat as layout stubs unless a feature explicitly redesigns them. Details: **`placeholders.md`**. Quick list: `device-calibration.html`, `exercise.html`, `sign-waiver.html` / `home-waiver.html`.

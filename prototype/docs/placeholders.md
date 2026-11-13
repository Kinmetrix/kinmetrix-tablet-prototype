# Placeholders

Screens and flows that are **intentionally incomplete** in this prototype. Do not treat them as finished product UI when proposing features — unless the feature is specifically to redesign that area.

## Hardware / device

Depends on BLE, sensors, or station firmware. Show layout and copy; no live streams.

| Area | Pages | What’s fake |
| --- | --- | --- |
| Calibration | `device-calibration.html` | Tare / weight flow; live force stream |
| Device control | Ignored slug `device-control` (not mirrored); related control UI if linked | Live device commands |
| Device list / modify | Ignored (`device-list`, `device-modify`) | Pairing / edit hardware |
| Live exercise | `exercise.html` | Real-time capture, thresholds, finish rules |
| Run group during capture | Parts of `run-group.html` after start | Device-driven step advance |

Mark new device UI with clear placeholder copy (e.g. “Live sensor not reproduced”).

## Legal / consent

| Area | Pages | What’s fake |
| --- | --- | --- |
| Waiver required home | `home-waiver.html` | No real `requires_waiver` flag |
| Sign waiver | `sign-waiver.html` | Signature popover is UI-only; nothing persists |

## Auth and access

| Area | Pages | What’s fake |
| --- | --- | --- |
| Login / password | `login.html`, `password-login.html` | No auth; index bypasses login |
| Password reset / set | Ignored (`password-reset`, `set-password`) | Out of mirror |
| Team PIN | Hinted on settings / team switch | Not enforced; no lockout |

## Data and backend

Everywhere else uses **fixtures** (hardcoded lists, charts via `data-chart`, default avatars). Do not:

- Call APIs or persist forms
- Enforce validation beyond visual required-field hints
- Invent live sync, offline queues, or notification systems in the HTML unless a PRD asks for that exploration

## Ignored routes (not shipped as pages)

See `.screenignore` / `screen-ignore.md`. Common reasons: dead route, duplicate hub, or hardware-heavy surface left out of the mirror. Inventory may still list them in `screens.json`.

## When proposing a feature

1. If the change is on a placeholder screen, say so and decide whether the proposal is **chrome/layout only** or a **full product redesign** of that flow.
2. Prefer exploring member day, roster, programs, templates, history, and compare before deep device work.
3. Keep placeholder boundaries visible in copy so reviewers do not screenshot stubs as shipping truth.

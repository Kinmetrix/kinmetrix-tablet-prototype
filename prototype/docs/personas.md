# Personas

Who uses the **shared clinic iPad**. Design for a landscape station others can walk up to — not a personal phone.

## Shared device facts

- One iPad at a Kinmetrix station (logical canvas **1180×820**).
- Touch-first; avoid hover-only affordances.
- Session context can switch between **team** (roster / admin) and **member** (athlete day).
- Login screens exist for layout only; the prototype does not gate the rest of the app.

## Primary roles

### Clinic operator / coach

Runs the station for a team: opens roster, picks a member, starts assessments or programs, reviews history and compare.

| Cares about | Typical entry |
| --- | --- |
| Roster search, last analysis at a glance | `team-home.html` |
| Jump into a member’s day | `team-user.html` → `home.html` |
| Compare sessions across members | `compare-team-user-sessions.html` |
| Templates and roster admin (often behind team PIN) | `team-settings.html` |

Fixture flavor: email like `coach@example.com` on password login.

### Athlete / member

Uses the iPad when coached through a session: home, start assessment or training, complete groups/steps, see results.

| Cares about | Typical entry |
| --- | --- |
| What to do next today | `home.html` → `home-start.html` |
| Running a group / exercise | `run-group.html` → `exercise.html` |
| Own history and analysis | `session-history.html`, `user-analysis-details.html` |
| First-time profile | onboarding journey in `journeys.md` |

Fixture flavor: member names like Alex Morgan; demo team “Demo Varsity.”

### Team admin (settings)

Same people as operators in many clinics; the **team settings** surface is the admin mode: users, columns, program/group/step/session templates, device calibration link.

| Cares about | Typical entry |
| --- | --- |
| Add / edit members | `team-user-list.html`, `add-team-user.html` |
| Template libraries | `*-template-list.html` |
| Station calibration | `device-calibration.html` (placeholder) |

Team PIN unlock is layout-relevant (settings / enter team view) but not enforced in the prototype.

## Secondary

| Role | Notes |
| --- | --- |
| **New member (onboarding)** | Step screens collect name, email, body metrics, team/sport/position, preferences including waiver. |
| **Unsigned waiver** | Member home blocked until terms signed — see `home-waiver.html` → `sign-waiver.html`. |

## Design implications

- Prefer large tap targets and clear primary CTAs; the next person at the station must recover context quickly.
- Keep team vs member chrome distinct (roster hub vs member home).
- Do not assume a logged-in personal account graph on every screen — fixtures are enough.
- Hardware and live capture are not persona goals here; mark them as placeholders (`placeholders.md`).

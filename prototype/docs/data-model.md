# Data model (product view)

How objects relate on the tablet UI. Enough to propose screens without inventing wrong entities. See **`glossary.md`** for term definitions.

## Hierarchy

```text
Team
  └── Member (user)
        ├── Programs → Groups → Steps → (live exercise / session data)
        ├── Protocol sessions → Assessment batches → Protocol assessments
        └── User analyses (from completed Groups or Assessment batches)
```

**Templates** (sidebar) holds:

- **Assessment** — team defaults for assessment **session setup** (mode, arc/tilt, directions, reps, target force)—not a template library. **Session plan** defaults (post-assessment follow-up) live under **Sessions** in the templates hub.
- **Sessions** — team session templates (metadata + steps); load summaries are derived from steps. The **Session plan** subtab holds post-assessment follow-up defaults, not a separate template type.
- **Programs** — multi-day program templates assigned to members.

Team **Settings** covers station, onboarding, and waiver only.

## Two paths that produce analysis

### Sessions (Groups)

```text
Member runs a Group
  → Steps completed
  → User analysis attached to that Group
  → Shows in session history, member home, compare
```

### Assessment (Protocol sessions)

```text
Member starts / continues a Protocol session
  → Assessment batch across rotator angles
  → User analysis attached to that batch
  → Shows in session history alongside Groups
```

A **user analysis** belongs to either a Group **or** an Assessment batch, never both.

## What screens usually show

| Surface | Typical objects |
| --- | --- |
| Team roster / member row | Member, last user analysis summary |
| Member home / start | Protocol session state, next Group / assessment CTA |
| Program list / edit | Program, Groups |
| Group list / run / results | Group, Steps, session / analysis summary |
| Session history / details | User analyses, Group or Assessment batch context |
| Compare sessions | Multiple user analyses / sessions |
| Templates hub | Active assessment + session plan defaults; session load presets; program templates |
| Team settings | Station, onboarding, waiver |
| Device / calibration / exercise | Hardware placeholders — not live BLE |

## Design rules

- Prefer **user analysis** language on history and compare screens; do not invent a separate “report object” unless product asks for one.
- **Protocol session** = configuration and progress; **assessment batch** = a completed assessment round.
- **Templates** configure future sessions; they are not the same as a member’s live Program / Group.
- Fixture data in HTML is fine; do not call APIs.

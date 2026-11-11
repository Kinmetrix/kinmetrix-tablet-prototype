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

Templates live under **Team settings** and spawn Programs / Groups / Steps (or team session templates) for members.

## Two paths that produce analysis

### Training (Groups)

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
| Team settings templates | Program / Group / Step / session templates |
| Device / calibration / exercise | Hardware placeholders — not live BLE |

## Design rules

- Prefer **user analysis** language on history and compare screens; do not invent a separate “report object” unless product asks for one.
- **Protocol session** = configuration and progress; **assessment batch** = a completed assessment round.
- **Templates** configure future sessions; they are not the same as a member’s live Program / Group.
- Fixture data in HTML is fine; do not call APIs.

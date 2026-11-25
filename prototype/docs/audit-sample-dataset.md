# Audit sample dataset shape

Reference for person → results → before/after weaving (huddle 2026-11-23). Use for report QA and scientific rigor checklists—not production PHI.

## Row grain

One **comparable visit** row (prototype: Pulse median-force list, comparable isometric visits).

| Field | Meaning | Example |
| --- | --- | --- |
| `person_id` | Stable member identifier | `alex` |
| `person_name` | Display name | Alex Morgan |
| `visit_id` | Unique visit/result id | From fixture `record.id` |
| `visit_at` | Completion timestamp (UTC) | `6 Nov 2026 · 9:30 a.m.` (display) |
| `visit_kind` | Session vs assessment vs program complete | `session` |
| `outcome_summary` | Peak/adherence snapshot | `30.7 kg · 91%` |
| `metric_before` | Prior comparable peak or baseline force | Prior visit peak in kg |
| `metric_after` | Current peak force | `30.7 kg` |
| `delta_force_kg` | After − before when comparable | `+2.5 kg` |
| `schema_version` | `v1` or `v2` | `v2` (default for new exports) |
| `hypothesis_note` | Optional framing | e.g. "Return-to-play block week 3" |

## Minimum sample set (demo)

Export **at least three persons** with:

1. Two isometric visits in range (so Δ force is defined).
2. One assessment and one session for contrast.
3. One row with null Δ (no prior comparable visit) to show edge handling.

Prototype source: `team-overview.js` pulse fixtures via `pulseComparableForceDeltas` and Pulse **Median force change** drill-down.

## Report weaving

Bundle CSV or JSON with:

- Column dictionary (this file).
- `data-version-history.md` version table.
- Date range used (Pulse period control).

When moving to production data, replace fixture ids with redacted clinic ids and attach retention policy.
# V1 and V2 data versioning (internal)

Canonical timeline from the 2026-11-23 product huddle. Update when production schema or export shape changes.

## Summary

| Milestone | Approximate date | What changed |
| --- | --- | --- |
| V1 baseline | Pre-2025 | Column-oriented visit/result model tied to legacy DB column links |
| V1 field tweaks | Months before V2 | Incremental V1 adjustments while V2 was planned |
| **V2 introduced** | **December 2025** | New version so behavior and schema could evolve without breaking V1 column bindings |
| V1 compatibility pass | After V2 | Extra V1 columns (e.g. range, Raymond sum value) to support V2 features while keeping old readers working |
| Backend migration | V2 launch window | Dual-read or migration period (exact cutover not recorded in prototype) |

## Hypothesis for auditors

When comparing before/after metrics in reports:

1. State which **version** of the result row (V1 vs V2 export) was used.
2. Record **when** the visit occurred and **when** the schema change shipped (table above).
3. Treat V1-only columns as **compatibility surface**; prefer V2 fields for new analysis.

## Prototype stance

`kinmetrix-experience` uses **fixture data**, not live V1/V2 APIs. This doc is the narrative anchor for audits and future ADRs; wire to real migration docs when the clients repo documents the cutover.
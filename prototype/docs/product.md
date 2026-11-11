# Product context (HTML prototype)

## Purpose

Static HTML walkthrough of the Kinmetrix **clinic shared iPad** (landscape station UI). Use it to re-evaluate screens, flows, and interface, and to propose new features — without a native app checkout.

This repo is the **portable source of truth** for exploration. Output lives under `prototype/`. Product vocabulary and object relationships live in **`glossary.md`** and **`data-model.md`**. Walkthrough paths: **`journeys.md`**. Who uses the station: **`personas.md`**. Intentional stubs: **`placeholders.md`**. Route inventory: **`screen-inventory.md`**.

## Deliverable

- One HTML file per route (or clear screen), with links that mirror the product graph in `screens.json`.
- Labels and structure should match existing enriched pages and visual-compare baselines where they exist. Copy can be simplified.
- Rebuilt markup in `prototype/`. Visual system is **not locked** (neutral wireframe CSS is fine).
- Route pages use a **tiny fixed status bar** (~26px, `shared.js`): Index, slug, **Debug** (overlay drawer), **iOS** (side-by-side compare). It stays in the viewport without eating tablet space; the device canvas scales to fit under the bar.
- App nav chrome (`KMScreen`-style: Back, title, header actions) belongs in `.wire-toolbar` in the default view. Debug `screen-header` is prototype-only and must not be the only place those controls live.
- Brand and fixture art live under `prototype/assets/` (Kinmetrix logos, `default-profile.svg`, chart SVGs). Pages use `shared.js` to mount `[data-chart]` and `[data-default-avatar]`.

## Depth of behavior

| Do | Do not |
| --- | --- |
| Show fields, lists, buttons, and navigation | Call APIs or persist real data |
| Use fixed fixture values in the page or in `prototype/fixtures/` | Enforce validation, auth, or business rules |
| Stub primary actions (next screen, toast, or noop) | Implement BLE, device firmware, or live exercise capture |
| Optional login **screens** for layout | Login **gating** that blocks the rest of the prototype |

Mark device, calibration, live run, and waiver flows with clear **placeholder** copy when the flow depends on hardware or backend. Full list: **`placeholders.md`**.

## Entry

`prototype/index.html` should let reviewers reach major areas **without** signing in. Use a persona or fixture picker if that helps.

## Tablet

Clinic **shared iPad**, landscape station. Target logical canvas **1180×820** (iPad 10th generation) inside the device frame in `kin-prototype.css`, same numbers in `visual-compare/device.json`. Touch-first. Avoid hover-only affordances.

## Non-goals (for now)

- Full pixel parity with a shipping native theme package (neutral wireframe CSS is fine)
- Choosing Web Awesome, design-interface tokens, or a full design system
- Requiring any sibling monorepo or native app checkout to use or extend this prototype

**Exception:** visual-compare baselines and enrichment still use **KMScreen-style** header structure (Back / title / header actions) in `.wire-toolbar` when that screen has a header. That is layout chrome parity, not theme token parity.

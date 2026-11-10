# Product context (HTML prototype)

## Purpose

Build a **static HTML walkthrough** of the shipping **KinmetrixApp** (React Native, clinic iPad) so the team can **re-evaluate screens, flows, and interface** without changing the native app.

This repo is a sandbox. Output lives under `prototype/`. Do not edit KinmetrixApp from here.

## Reference app

Screen names, routes, and layout truth come from KinmetrixApp. Read paths and rules in **`reference-app.md`** before adding or changing HTML pages.

## Deliverable

- One HTML file per RN screen (or clear route), with links that mirror the app graph.
- Labels and structure should follow the reference screen files. Copy can be simplified.
- Rebuilt markup in `prototype/`. Visual system is **not locked** (neutral wireframe CSS is fine).
- Route pages use a **Debug** toggle (`shared.js`) for index links, route chips, and flow-nav. Default view matches app layout for review and screenshots.
- Brand and fixture art live under `prototype/assets/` (Kinmetrix logos from the RN app, `default-profile.svg`, chart SVGs). Pages use `shared.js` to mount `[data-chart]` and `[data-default-avatar]`.

## Depth of behavior

| Do | Do not |
| --- | --- |
| Show fields, lists, buttons, and navigation | Call APIs or persist real data |
| Use fixed fixture values in the page or in `prototype/fixtures/` | Enforce validation, auth, or business rules |
| Stub primary actions (next screen, toast, or noop) | Implement BLE, device firmware, or live exercise capture |
| Optional login **screens** for layout | Login **gating** that blocks the rest of the prototype |

Mark device, calibration, live run, and waiver flows with clear **placeholder** copy when the real app depends on hardware or backend.

## Entry

`prototype/index.html` should let reviewers reach major areas **without** signing in. Use a persona or fixture picker if that helps.

## Tablet

Clinic **shared iPad**, landscape station. Target logical canvas **1180×820** (Kinmetrix IPad sim, iPad 10th generation) inside the device frame in `kin-prototype.css`, same numbers in `visual-compare/device.json`. Touch-first. Avoid hover-only affordances.

## Non-goals (for now)

- Pixel parity with RN or `@kinmetrix/theme`
- Choosing Web Awesome, design-interface tokens, or a full design system
- Automated reverse runs against KinmetrixApp (it lives outside this git repo)

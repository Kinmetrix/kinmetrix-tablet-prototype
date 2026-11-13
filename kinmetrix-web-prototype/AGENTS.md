# Kinmetrix — agent brief

Interactive browser prototype of a future **responsive web app** (not an app-store native app). This repo focuses on the **phone-width** experience first (~390px). The UI shows **finished** sessions from visits, progress over time, profile prep, and **finding a location / signing in on the device**. It does not run workouts or control live sessions in the browser.

All implementation lives in **`index.html`** (styles, screens, charts, state). Usage and demo codes are in **`README.txt`**. There is no build step and no separate `dist/` or JS files in this repository.

## How to work

- Do what the user asked with the **smallest complete change**.
- **Default:** match existing screens, copy, and flows in `index.html`.
- The user’s latest message wins if it conflicts with this file.
- Ask only when the change needs an **unsettled product decision** (not for routine layout or implementation).
- Describe simulated flows honestly—no real camera, QR, email, or device pairing.

## Product intent (keep this feel)

Someone may have **no account**, **never used Kinmetrix**, and **never visit a facility**. Empty Home should still feel useful—not a signup wall or onboarding checklist.

Tone: quiet, clinical, spacious. Layout is phone-first today; broader breakpoints may come later—don’t block responsive work, but don’t expand layout scope unless asked. Short sentences. One primary action where it matters. Lucide-style line icons if you add icons. **Do not use the word “Arc” in user-facing copy**; prefer “Find a location” and “Sign in on the device.” Device confirmation shows the **facility name** only (no separate device id label).

## Invariants (prefer these; don’t drift without being asked)

**Navigation:** Footer tabs **Home · Progress · Profile** only. **Top-right on Home** (icon + accessible label): opens a hub (**Find a location**, **Sign in on the device**). Device sign-in and find-location screens stay under Home in the footer selection. Empty Home keeps a secondary **Find a location**; retired idea: a fourth footer tab for find/sign-in.

**Data & metrics:** Session summary uses **average peak force (N)**, **stability**, **symmetry**—not legacy Range/Peak/Consistency or a single ROM aggregate. Radar chart is **peak force by direction** (eight directions today). Fictional data is labeled **Sample** in UI and accessibility text.

**Scope — avoid unless requested:** streaks, goals, social, sharing, general notifications (facility-opening email on Find is the exception), live session/warmup/assessment controls on the phone, opening the QR scanner outside the device sign-in flow.

**Device sign-in (simulated):** Scan or enter code → confirm device → success → back to Home. Sign-in must not skip confirmation or open phone workout controls.

## Where to look in `index.html`

Search for routing helpers (`homeRoute`, `navigate`, scenario controls), screen ids (`km-*`, including legacy `km-arc-*` route ids), fixture strings (visit dates, N values), and `KinmetrixCharts`. When you change metrics or visit data, update **every occurrence** in that file so charts, cards, and a11y text stay aligned.

Demo values: see **README.txt** (e.g. screen code, verification code).

## Validation

Open `index.html` in a browser. Run through paths that share navigation or data with your change (scenarios in README). After routing or device sign-in flow changes, run `node formal/check.mjs` (see `.cursor/skills/verify-kinmetrix-navigation`). If you can’t run a browser, say what you checked statically and what you didn’t.

## Open product questions

Don’t invent answers unless the task requires them: stability/symmetry definitions, production force aggregation, required profile fields, real kiosk matching, real facilities, real session delivery.

Production architecture, clinical interpretation, and native app packaging are out of scope for this prototype repo.

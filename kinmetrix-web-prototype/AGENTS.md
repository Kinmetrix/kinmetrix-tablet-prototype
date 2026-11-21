# Kinmetrix — agent brief

Interactive browser prototype of a future **responsive web app** (not an app-store native app). This repo focuses on the **phone-width** experience first (~390px). The UI shows **finished** sessions from visits, progress over time, profile prep, and **finding a location / signing in on the device**. It does not run workouts or control live sessions in the browser.

All implementation lives in **`index.html`** (styles, screens, charts, state). Usage and demo codes are in **`README.txt`**. There is no build step and no separate `dist/` or JS files in this repository.

## How to work

- Do what the user asked with the **smallest complete change**.
- **Default:** match this brief, invariants, and empty-state rules. Treat `index.html` as implementation; when it conflicts with the experience bar, change the markup.
- The user’s latest message wins if it conflicts with this file.
- Ask only when the change needs an **unsettled product decision** (not for routine layout or implementation).
- Describe simulated flows honestly—no real camera, QR, email, or device pairing.

## Product intent (keep this feel)

Someone may have **no account**, **never used Kinmetrix**, and **never visit a facility**. Empty Home should feel **useful without lying**: orient and offer Find a location (and paths to sign in / device sign-in)—not a signup wall, not a checklist, and **not** fixture sessions on the landing screen.

Tone: quiet, clinical, spacious. Layout is phone-first today; broader breakpoints may come later—don’t block responsive work, but don’t expand layout scope unless asked. Short sentences. One primary action where it matters. Lucide-style line icons if you add icons. **Do not use the word “Arc” in user-facing copy**; prefer “Find a location” and “Sign in on the device.” Device confirmation shows the **facility name** only (no separate device id label).

**Copy:** Short, clinical, honest about state (empty vs has sessions). Avoid “your” for data the user does not have.

## Experience bar: real app, simulated backend

**Default path = production UX.** A stranger opening the app with no query params should see what we would ship: truthful empty states, one clear primary action, no demo museum on the first screen.

**Simulated backend is fine.** Auth, QR, email, facilities, and session data can stay client-side in `index.html`. “Real app” means interaction design and copy, not a separate production repo.

**Prototype ≠ demo chrome on Home.** Reviewer scenarios (`?scenario=one|history|empty`, theme params, demo codes in README) are for walkthroughs. They must not define what guest Home looks like by default.

### Empty and guest states

- **Guest Home (default):** No session card, no clinic names, no metric numbers on first paint. Copy in the present tense for someone with zero visits (e.g. no sessions yet—not “your visits” beside fake data).
- **Signed in, zero visits:** Same honesty; do not reuse the guest demo card as if it were the member's data.
- **Progress / Profile when empty:** No sample charts or fixture profile on the default empty path; short explanation of what appears after a visit (or after sign-in where relevant).
- **Preview is optional and explicit:** If we show what a session looks like, it lives behind a clear secondary action (e.g. text link), opens a dedicated screen, and stays labeled **Sample** in UI and accessibility text. No primary button named “View sample” on Home.

### When fictional data is allowed

| OK | Not on default empty Home / empty tabs |
| --- | --- |
| User opens an explicit preview route | Session card on `#km-first` without a visit |
| `?scenario=one` or `?scenario=history` (reviewer) | Progress charts before the app state has visits |
| Signed-in flows after scenario or simulated sign-in populates state | Copy that implies ownership of sample metrics |
| Device sign-in and Find flows using labeled **Sample** where needed | Stacking placeholder + primary + account link above the fold |

## Invariants (prefer these; don’t drift without being asked)

**Navigation:** Footer tabs **Home · Progress · Profile** only. **Top-right on Home** (icon + accessible label): opens a hub (**Find a location**, **Sign in on the device**). Device sign-in and find-location screens stay under Home in the footer selection. Empty Home keeps a secondary **Find a location**; retired idea: a fourth footer tab for find/sign-in.

**Data & metrics:** Session summary uses **average peak force (N)**, **stability**, **symmetry**—not legacy Range/Peak/Consistency or a single ROM aggregate. Radar chart is **peak force by direction** (eight directions today). Fictional data is labeled **Sample** wherever it appears in UI and accessibility text—and must not appear on default empty surfaces (see **Empty and guest states**).

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
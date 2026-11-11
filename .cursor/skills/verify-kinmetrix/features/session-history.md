# Session history

From member home analysis, the user opens session history to browse past activities and related analysis entry points.

## Sub-features

- `history-open` reaches SessionHistory from Home.
- `history-open-session` opens a session/analysis detail from history when a card or link is present.

## How to get to it (user POV)

- On `home.html`, choose the **History** affordance in the metrics area (`History >` / sparkline link to `session-history.html`).
- Review the history grid titled for the fixture member.

## Driving it with verify-kinmetrix

Preconditions:

- Doctor is healthy.
- Start on Home: `… goto home.html`.

- **Open history.** Run `… click --role link --name "History"`. `assert-route SessionHistory` passes. Toolbar title contains `Session History` or `Test User's Session History`.
- **Confirm chrome.** Run `… assert-text "Normalized"` (toggle present) and confirm filter tabs such as **All**.
- **Optional detail.** If a session card links onward, click it and assert the destination route (`SessionData` / analysis detail). If no navigable card is reachable, record failure with reason in Gotchas — do not skip by `goto`.
- **Proof.** `… snapshot --path session-history/grid.json` and `… screenshot --path session-history/grid.png` on SessionHistory.

## Gotchas

- Prefer the in-canvas History control over `flow-nav` or a bare `goto session-history.html` when claiming the Home entry point.
- Link accessible name may be `History >` — `--name "History"` still matches (case-insensitive substring regex in the helper).
- Placeholder / empty history states are separate pages; this feature assumes the enriched Home with a latest session.

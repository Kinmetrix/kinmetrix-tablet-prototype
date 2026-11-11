# Layout enrichment loop

Agents wake on `/loop` until every **mirror** route (`screens.json` minus `prototype/.screenignore`) has enriched wireframe HTML.

## Stop condition

```bash
cd prototype
node scripts/check-layout-enrichment.mjs
```

Exit `0` means done. Stop the loop and report completion.

## Each tick

1. Run `check-layout-enrichment.mjs`. If OK, stop the loop.
2. `node scripts/list-pending-enrichment.mjs --limit 6 --json`
3. For each batch item, use sibling enriched pages, `docs/journeys.md`, and `visual-compare/pairs/<slug>.png` (when present) as layout reference.
4. Rewrite `prototype/<html>` with neutral wireframe markup per `product.md`.
5. Mark done with `data-enriched="true"` on `<body>` and an HTML comment with the route name.
6. Remove `stub-note` and `placeholder-panel`. Keep `screen-header` and `flow-nav` in the markup; `shared.js` moves them into the **Debug** overlay on route pages (`data-enriched="true"`). Default view is RN-clean.
7. Mirror **KMScreen-style** chrome in the default view with a full-bleed `.wire-toolbar` as the **first child** of `.app__content` (Debug does **not** move it). Do **not** put the toolbar inside `.wire-center` (that vertically centers the header mid-screen). Center only the form/body in an inner `.wire-center` under the toolbar. Slots: left Back (`.wire-toolbar-back`) when the stack would show Back, centered `.wire-toolbar__title`, right actions (`.wire-btn--header` for Create/Save, `.wire-btn--add` for list Add). If Create/Save is in the toolbar, do not duplicate it in the form. Put route chip / All screens / `enriched-meta` only in `screen-header`, never as the only title/Back.
8. Skip `.wire-toolbar` only for chrome-less shells (Login, PasswordLogin, Loading, Feedback / popover shells). Empty header chrome still needs the bar when the screen normally has one.
9. Add `flow-nav` links for primary actions (`href` to sibling HTML files).
10. Re-run the check. Enrich more in the same tick only if time allows (target 4–8 screens per tick).

## Rules

- No APIs, validation, or auth gating.
- Fixture copy is fine.
- Extend `kin-prototype.css` when a pattern repeats across screens.
- Stop check includes `check-kmscreen-toolbar.mjs` (via `check-layout-enrichment.mjs`): enriched KMScreen-style routes must keep a visible `.wire-toolbar`.
- Use real brand art from `assets/` (`kin-logo--full`, `kin-logo--mark`). Profile photos use `data-default-avatar` (see `default-profile.svg`). Charts use `<div class="proto-chart" data-chart="line|bar|radial|radial-multi">` (mounted by `shared.js`). Run `yarn assets:apply` after bulk stub edits.
- Do not run `generate-html-stubs.mjs` with `FORCE_STUBS=1` on enriched files.
- After inventory edits, update `screens.json`, then `yarn screens:manifest` (and stubs if needed), then resume enrichment.

## Priority (when choosing order beyond manifest sort)

Auth and hubs first, then user flows, team flows, team settings, onboarding steps, device/debug screens.

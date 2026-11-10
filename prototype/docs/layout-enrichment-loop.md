# Layout enrichment loop

Agents wake on `/loop` until every **mirror** route (`screens.json` minus `prototype/.screenignore`) has wireframe HTML from KinmetrixApp.

## Stop condition

```bash
cd prototype
node scripts/check-layout-enrichment.mjs
```

Exit `0` means done. Stop the loop and report completion.

## Each tick

1. Run `check-layout-enrichment.mjs`. If OK, stop the loop.
2. `node scripts/list-pending-enrichment.mjs --limit 6 --json`
3. For each batch item, open `sourceFile` under `kinmetrixAppRoot` from the JSON (read only).
4. Rewrite `prototype/<html>` with neutral wireframe markup per `product.md`.
5. Mark done with `data-enriched="true"` on `<body>` and an HTML comment `source: <path>`.
6. Remove `stub-note` and `placeholder-panel`. Keep `screen-header` and `flow-nav` in the markup; `shared.js` moves them into the **Debug** overlay on route pages (`data-enriched="true"`). Default view is RN-clean.
7. Add `flow-nav` links for primary actions (`href` to sibling HTML files).
8. Re-run the check. Enrich more in the same tick only if time allows (target 4–8 screens per tick).

## Rules

- No APIs, validation, or auth gating.
- Fixture copy is fine.
- Extend `kin-prototype.css` when a pattern repeats across screens.
- Use real brand art from `assets/` (`kin-logo--full`, `kin-logo--mark`). Profile photos use `data-default-avatar` (see `default-profile.svg`). Charts use `<div class="proto-chart" data-chart="line|bar|radial|radial-multi">` (mounted by `shared.js`). Run `yarn assets:apply` after bulk stub edits.
- Do not run `generate-html-stubs.mjs` with `FORCE_STUBS=1` on enriched files.
- After navigator changes in KinmetrixApp, run `yarn screens:sync` then resume enrichment.

## Priority (when choosing order beyond manifest sort)

Auth and hubs first, then user flows, team flows, team settings, onboarding steps, device/debug screens.

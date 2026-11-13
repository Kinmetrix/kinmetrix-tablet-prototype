# Screen inventory

This repo’s **`prototype/screens.json`** is the source of truth for which routes exist and how they map to HTML. There is no external app checkout.

## Files

| File | Role |
| --- | --- |
| `prototype/screens.json` | Full route list (`route`, `stack`, `slug`, `html`, `title`, `links`) |
| `prototype/.screenignore` | Slugs excluded from the HTML mirror (see `screen-ignore.md`) |
| `prototype/docs/screen-index.md` | Human-readable mirror list (active routes only) |
| `prototype/*.html` | One page per mirrored route, plus `index.html` |

## Conventions

- HTML file names: kebab-case slug (e.g. `edit-program.html`).
- Links use relative `href` between HTML files. Match `links` in `screens.json` and `flow-nav` on the page.
- Stacks: `app`, `team`, `team-settings`, `user`, `onboarding-step`.
- Optional HTML comment on a page: route name for debugging.

## Add or change a screen

1. Edit `prototype/screens.json` (add/rename/remove the route object; keep `slug` / `html` aligned).
2. Add or update the HTML page under `prototype/`.
3. Refresh the index and docs:

```bash
cd prototype
yarn screens:manifest   # rebuilds docs/screen-index.md from screens.json
yarn screens:stubs      # refreshes index.html; creates missing stubs only
```

Coverage:

```bash
node scripts/check-screen-coverage.mjs
```

## Layout enrichment

Wireframe completeness is tracked by `data-enriched="true"` on each mirrored page. Loop playbook: `layout-enrichment-loop.md`.

```bash
yarn screens:enrichment-check
node scripts/list-pending-enrichment.mjs --limit 6 --json
```

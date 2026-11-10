# Screen ignore list

Routes listed in **`prototype/.screenignore`** are excluded from the HTML mirror.

## Format

- One **exact slug** per line (matches `slug` in `screens.json`, e.g. `sandbox`).
- Blank lines and `#` comments are allowed.

## Effect

Ignored slugs are omitted everywhere the mirror is built or listed:

- No `*.html` route page (existing files are removed when you run `generate-html-stubs.mjs`).
- Not listed on `index.html`.
- Skipped by coverage, layout-enrichment, pending-enrichment, and visual-compare scripts.

`screens.json` still lists the full route set from KinmetrixApp when you regenerate the manifest; `.screenignore` only controls what the mirror ships.

## Commands

```bash
# After editing .screenignore
node scripts/generate-html-stubs.mjs   # refresh index + drop ignored pages
node scripts/build-screen-manifest.mjs # refresh docs/screen-index.md (mirror list only)
```

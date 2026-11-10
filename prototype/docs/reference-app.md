# KinmetrixApp reference (read only)

KinmetrixApp is the **source of truth** for which screens exist and how they connect. Use it to decide what HTML to add under `prototype/`.

## Location

From this repo root (sibling checkout):

```text
../kinmetrix-clients/apps/KinmetrixApp
```

Absolute path on this machine (update if you move the repo):

```text
/Users/angelescott/Desktop/Kinmetrix/kinmetrix-clients/apps/KinmetrixApp
```

**Read only.** Do not modify KinmetrixApp when working in kinmetrix-tablet-prototype.

## Read order

| Order | Path under KinmetrixApp | Use |
| --- | --- | --- |
| 1 | `src/navigation/AppNavigator.tsx` | Root stack (auth, team view, user view, device, settings, …) |
| 2 | `src/navigation/UserNavigator.tsx` | Member home, programs, exercise, analysis, templates |
| 3 | `src/navigation/TeamNavigator.tsx` | Team roster and team-scoped flows |
| 4 | `src/navigation/TeamSettingsNavigator.tsx` | Team settings and template admin |
| 5 | `docs/GLOSSARY.md` | Product vocabulary (program, protocol, group, …) |
| 6 | `docs/DATA_MODEL_RELATIONSHIPS.md` | Optional, when a screen shows linked entities |

## Finding screens

- Stack files import screen modules under `src/screens/` and `src/features/`.
- Route names in navigator `ParamList` types map to React Navigation route names.
- For each new `prototype/*.html`, record in an HTML comment: **route name** and **source file** (e.g. `EditProgramScreen` → `src/screens/EditProgramScreen.tsx`).

## HTML mapping conventions

- File names: kebab-case from screen or route (e.g. `edit-program.html`).
- Links use relative `href` between HTML files. Match the navigator graph as closely as practical.
- Modals and one-off sheets can be separate pages or labeled stubs.

## Screen inventory in this repo

Regenerate HTML stubs from KinmetrixApp navigators:

```bash
cd prototype
yarn screens:sync
```

Outputs `screens.json`, `prototype/docs/screen-index.md`, and one `*.html` per mirror route. Routes in `prototype/.screenignore` are skipped (see `screen-ignore.md`). Coverage check:

```bash
node scripts/check-screen-coverage.mjs
```

## Layout enrichment

Stubs become wireframe layouts from each screen’s `sourceFile` in `screens.json`. Loop until:

```bash
yarn screens:enrichment-check
```

Agent playbook: `layout-enrichment-loop.md`. Next batch:

```bash
node scripts/list-pending-enrichment.mjs --limit 6 --json
```

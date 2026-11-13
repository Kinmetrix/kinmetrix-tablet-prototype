# Agents

Kinmetrix **clinic shared iPad** prototype (landscape station UI). Not a personal phone app. This repo is **self-contained** — no external app checkout.

| Path | Role |
| --- | --- |
| `site/` | GitHub Pages hub (`index.html`). Cards open the three linked prototypes below. |
| `kinmetrix-experience/` | Landscape iPad experience. Pages path `/experience/`. |
| `kinmetrix-web-prototype/` | Phone-width web app. Pages path `/web/`. |
| `prototype/` | HTML screen inventory. Pages path `/prototype/`. |
| `factory/` | Software-factory output (PRDs, runs). |

## Read before changing product UI

1. `prototype/docs/product.md` — purpose, depth, tablet constraints  
2. `prototype/docs/glossary.md` — vocabulary  
3. `prototype/docs/personas.md` — who uses the station  
4. `prototype/docs/journeys.md` — primary flows  
5. `prototype/docs/data-model.md` — object relationships  
6. `prototype/docs/placeholders.md` — stubs that are not shipping truth  
7. `prototype/docs/screen-inventory.md` — frozen `screens.json` / how to add routes  

## Propose a feature or screen update

- Explore via `yarn dev` and the journeys above.  
- Prefer new/changed HTML under `prototype/` plus notes or a PRD under `factory/`.  
- Add or rename routes in `prototype/screens.json` (do not assume an external app).  
- Call out placeholder surfaces explicitly when the idea touches device, waiver, or auth.

## Layout enrichment (agents)

Done when `node prototype/scripts/check-layout-enrichment.mjs` exits 0.  
Follow `prototype/docs/layout-enrichment-loop.md` on each `/loop` tick.  
Visual-compare baselines are archived under `prototype/visual-compare/`; see `prototype/docs/visual-compare.md`.

## Prove HTML behavior

For user-path proof of the static prototype (not RN visual-compare), read and follow `.cursor/skills/verify-kinmetrix/SKILL.md`. Use its harness and `features/` map; do not drive a shared `yarn dev` instance you did not start.
# Agents

Kinmetrix **clinic shared iPad** prototype (landscape station UI). Not a personal phone app. This repo is **self-contained** — no external app checkout.

| Path | Role |
| --- | --- |
| `prototype/` | Static HTML UI. Run `yarn dev` from there. |
| `factory/` | Software-factory output (PRDs, runs). |
| `prototype/docs/` | Product docs for agents and PMs. |

Before editing HTML in `prototype/`, read **`prototype/docs/product.md`**, **`glossary.md`**, and **`screen-inventory.md`**. For flows and audience, use **`journeys.md`**, **`data-model.md`**, **`personas.md`**, and **`placeholders.md`**.

Layout enrichment is done when `node prototype/scripts/check-layout-enrichment.mjs` exits 0. Follow **`prototype/docs/layout-enrichment-loop.md`** on each `/loop` tick.

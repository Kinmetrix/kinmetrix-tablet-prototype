# Agents

Kinmetrix **clinic shared iPad** prototype (landscape station UI). Not a personal phone app.

| Path | Role |
| --- | --- |
| `prototype/` | Static HTML UI. Run `yarn dev` from there. |
| `factory/` | Software-factory output (PRDs, runs). |
| `prototype/docs/` | Product and reference docs for agents. |

Before editing HTML in `prototype/`, read **`prototype/docs/product.md`** and **`prototype/docs/reference-app.md`**.

Layout enrichment is done when `node prototype/scripts/check-layout-enrichment.mjs` exits 0. Follow **`prototype/docs/layout-enrichment-loop.md`** on each `/loop` tick.

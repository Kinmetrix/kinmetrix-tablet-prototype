# Side-by-side visual compare

Saved **pair PNGs** (archived iOS baseline left, HTML mirror right) for each active mirror slug (`screens.json` minus `prototype/.screenignore`).

Baselines under `visual-compare/rn/` are a **frozen reference** shipped with this repo. Day-to-day prototype work does not require a native app or simulator. Optional RN re-capture tooling remains for engineers who still have a local install; it is not part of the portable PM workflow.

## Layout

```text
prototype/visual-compare/
  device.json          # canvas size + optional sim identity for eng recapture
  rn/<slug>.png        # archived baseline (left tile)
  html/<slug>.png
  pairs/<slug>.png
  index.html           # gallery of pairs
```

## Portable commands (HTML side)

From `prototype/` (with `yarn dev` running; set `PROTOTYPE_URL` if not port 5173):

```bash
yarn visual:html                    # all HTML screenshots
yarn visual:stitch                  # build pairs/ where both sides exist
yarn visual:index                   # regenerate gallery
```

## Optional eng-only RN recapture

Requires a local Kinmetrix iPad simulator install. Skip unless refreshing baselines.

```bash
yarn visual:rn:missing              # slugs still missing in visual-compare/rn/
yarn visual:rn login                # capture current sim frame → rn/login.png
yarn visual:rn:interactive          # walk missing slugs (navigate, Enter to capture)
```

### RN capture rules (eng only)

- Use **Kinmetrix IPad** only (`visual-compare/device.json`). Never an iPhone or any other booted sim.
- Do not call agent-device `open` without `--device "Kinmetrix IPad"`.
- `simctl io <udid> screenshot` is the canonical save path when MCP automation is unavailable (UDID from `device.json`).
- Raw sim PNGs are portrait. `capture-rn-screenshot.mjs` rotates **90°** so landscape tablet UI is upright (override with `RN_ROTATE_DEGREES`).

## HTML capture

Viewport **1180×820** landscape logical points from `visual-compare/device.json` (iPad 10th generation, matches `kin-prototype.css`). Runs headless Chromium via Playwright. Captures the **`.device-frame` canvas clipped to 1180×820** (not full scrollHeight of `.app__content`) with debug overlay closed.

## Pair stitch

Both sides are resized to **2360×1640** (`pixelWidth` × `pixelHeight` in `device.json`) with `fit: contain`, then placed side by side. The seam is always at the same x for every pair.

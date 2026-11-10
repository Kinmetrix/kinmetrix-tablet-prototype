# Side-by-side visual compare

Saved **pair PNGs** (RN simulator left, HTML mirror right) for each active mirror slug (`screens.json` minus `prototype/.screenignore`).

## Layout

```text
prototype/visual-compare/
  device.json          # Kinmetrix IPad simulator UDID (do not use other booted sims)
  rn/<slug>.png
  html/<slug>.png
  pairs/<slug>.png
  index.html           # gallery of pairs
```

## Commands

From `prototype/` (with `yarn dev` running; set `PROTOTYPE_URL` if not port 5173):

```bash
yarn visual:html                    # all HTML screenshots
yarn visual:rn:missing              # slugs still missing in visual-compare/rn/
yarn visual:rn login                # capture current Kinmetrix IPad frame → rn/login.png
yarn visual:rn:interactive          # walk missing slugs (navigate, Enter to capture)
yarn visual:stitch                  # build pairs/ where both sides exist
yarn visual:index                   # regenerate gallery
```

### RN capture workflow

1. Boot **Kinmetrix IPad** only. Put the app on the target screen.
2. `yarn visual:rn <slug>` saves and rotates the sim framebuffer.
3. For bulk work, run `yarn visual:rn:interactive` and use the slug list as a checklist.
4. Optional: `agent-device open com.timehero.Kinmetrix --device "Kinmetrix IPad" --foreground` keeps a session for taps when accessibility is sparse (coordinate `press` on landscape points).

Most routes still need manual navigation or scripted UI drives. There is no deep-link map for all stack screens yet.

## RN capture rules

- Use **Kinmetrix IPad** only (`visual-compare/device.json`).
- Do not call agent-device `open` without `device: Kinmetrix IPad`.
- `simctl io <udid> screenshot` is the canonical save path when MCP automation is unavailable.
- Raw sim PNGs are portrait. `capture-rn-screenshot.mjs` rotates **90°** so landscape tablet UI is upright (override with `RN_ROTATE_DEGREES`).

## HTML capture

Viewport **1180×820** landscape logical points from `visual-compare/device.json` (iPad 10th generation, matches `kin-prototype.css`). Runs headless Chromium via Playwright. Captures **`.app__content` only** with debug overlay closed (no route chrome in PNGs).

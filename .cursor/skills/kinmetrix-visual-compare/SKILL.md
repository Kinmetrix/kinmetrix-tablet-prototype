---
name: kinmetrix-visual-compare
description: >-
  Capture and verify Kinmetrix tablet RN↔HTML visual-compare pairs on Kinmetrix
  IPad. Use when the user mentions visual-compare, screen-compare, pairs PNGs,
  yarn visual:rn, yarn visual:stitch, missing RN captures, finishing all mirror
  screen pairs, portrait or tall pair tiles, seam/misaligned tiles, or
  same-viewport complaints in kinmetrix-tablet-prototype.
---

# Kinmetrix visual compare

Side-by-side pairs under `prototype/visual-compare/`: archived iOS baseline left, HTML mirror right. Docs: `prototype/docs/visual-compare.md`.

**Portable default:** prefer existing `rn/` + `pairs/` baselines. HTML capture / stitch / index do not need a native app.

**Eng-only RN recapture:** Device identity in `prototype/visual-compare/device.json` (**Kinmetrix IPad** only). Product team PIN is not that file — see Team gate below.

## Before capturing

1. On a pair complaint or before trusting a slug, **Read** `prototype/visual-compare/pairs/<slug>.png` and `rn/<slug>.png`. Do not ask the user to re-attach those images first.
2. A file on disk is not proof of the right screen. After navigation, `agent-device wait text "<route copy>"`, then capture, then **Read** the new `rn/<slug>.png` before stitch or the next slug.

## Device and permissions

1. First `yarn visual:rn*` / `xcrun simctl io … screenshot` in a local session: Shell `required_permissions: ["all"]`. The Cursor sandbox cannot reach CoreSimulatorService. There is no System Settings toggle for simctl.
2. **Kinmetrix IPad only.** Every `agent-device` call that takes a device must pass `--device "Kinmetrix IPad"` (or the UDID in `visual-compare/device.json`). Never omit `--device`. Never open, boot, or foreground an iPhone (or any other) simulator for this workflow. The app is already installed on Kinmetrix IPad.
3. Pair tiles must share one landscape canvas (logical **1180×820**, per-side stitch tiles **2360×1640**). Full `pairs/<slug>.png` is two tiles side-by-side (~**4724×1640**) — never treat pair width as one tile. Recapture HTML with `yarn visual:html` after capture-script changes; do not leave tall/portrait HTML tiles in `visual-compare/html/`.

## agent-device

1. If `user-agent-device` GetDynamicTools returns only `mcp_auth`, call `mcp_auth` once if needed, then drive the sim with the **CLI** (`agent-device open|snapshot|press|wait|find`). Do not block the capture loop on a full MCP tool catalog.
2. Open from `prototype/` (sessions are cwd-keyed). On `DEVICE_IN_USE` / stale lock: `agent-device session list` → `agent-device close --device "Kinmetrix IPad"` → `pkill -f agent-device` → reopen with `--device "Kinmetrix IPad" --foreground`.
3. Prefer semantic targets: snapshot refs, `press @ref --settle`, then `wait text "…"`. `--settle` is for `press` / `click` / etc., not for `find`. Use `find "<query>" press [--first]` only — no `--text`, no `--settle` on `find`.
4. A private-ax / complex-tree fallback that still lists `@eN` is still ref-capable — keep `press @ref`. Only use coordinates when AX is truly unavailable. Raw `agent-device screenshot` frames are often portrait while `press x y` uses landscape logical coords — rotate 90° before reading coords from raw screenshots; rely on `yarn visual:rn` / `rotate-rn-png` for pair files.
5. Text fields: press the field **without** `--settle`, then `type "…" --delay-ms N`, then dismiss the keyboard before Next. Do not rely on `fill … --settle` for this app.
6. Prefer running or extending `prototype/scripts/capture-rn-dev-stack.mjs`, `capture-rn-team-batch.mjs`, and `capture-rn-onboarding-rest.mjs` (and `yarn visual:rn:dev-stack`) over rediscovering taps in chat. After a working navigation fix, encode it in the matching script or `prototype/docs/visual-compare.md` before continuing the queue. For Compare multi-select, tap checkbox corners (not the card body — that opens Session Details) and the Compare N sessions footer; encode that path in `capture-rn-team-batch.mjs` before retrying the slug in chat.

## Auth / Login stack

1. `agent-device open com.timehero.Kinmetrix --device "Kinmetrix IPad" --foreground` resumes the live session (often already logged in).
2. For Login / PasswordLogin / related auth captures: open with `--foreground --relaunch`, snapshot, and if not on Login, logout (user menu → Logout) before tapping **Get Started**.
3. Password login: after Get Started, wait for text like `Log in to Kinmetrix`, then `yarn visual:rn password-login` with unrestricted permissions.
4. **Team gate:** On Enter Pin / Settings unlock, read the PIN keypad sequence from `prototype/scripts/capture-rn-team-batch.mjs` (team pin **5555**: press `590,431` four times, then Submit `590,659`) and enter it without asking the user.

## Capture → pair

From `prototype/` (HTML side needs `yarn dev` / `PROTOTYPE_URL`):

```bash
yarn visual:rn:missing          # checklist
yarn visual:rn <slug>           # current Kinmetrix IPad frame → rn/<slug>.png
yarn visual:stitch
yarn visual:index
```

Do not use `yarn visual:rn:interactive` as an unattended loop body (stdin prompts). Prefer `snapshot` / `wait text` for navigation checks. Do not leave probe/`_*.png` under `visual-compare/rn/` — write scratch under `/tmp`, or delete `rn/_*.png`, before stitch/index.

## Bulk / loop

Pair with the **loop** skill. Stop when `yarn visual:rn:missing` reports no missing slugs, then stitch and index. Use sentinel `AGENT_LOOP_WAKE_kinmetrix-visual-compare` (not the layout-enrichment sentinel). Never use `check-layout-enrichment.mjs` as the visual-compare stop check. Run one full tick (missing check → navigate → wait → capture → Read PNG → stitch) before arming the loop. Before arming, verify html/rn tiles are landscape tablet canvas (**2360×1640**) and pair width ≈ two sides (~**4724×1640**); right-screen copy alone is not enough. Skip `device-calibration` unless the user asks for it or that slug is the explicit capture target; leave with Back if you land there unintentionally.

# Kinmetrix experience prototype

Interactive browser exploration for a landscape iPad. Built from the product brief, using the engineering prototype as domain reference.

## Run locally

From this directory: `python3 -m http.server 4173 --directory dist`, then open http://localhost:4173. No install or build step. The 3D study uses a locally vendored Three.js runtime. Reload or **Reset demo** clears in-memory changes.

## Explore

Use **Settings** at the bottom of the sidebar to choose Light or Dark appearance; the prototype bar also provides a quick theme switch. This preference persists locally without changing the active session. Mode selection explains each option’s purpose; radials are prominent throughout preparation, live work, and review.

- The sidebar owns global navigation: Find, Roster, and Programs above; Station, Settings, the clinician avatar switcher, and Lock below. There is no duplicate top bar. On narrow screens these become one bottom bar.
- Start in Find with no member preselected. Search by name, or use Open roster for the full table. Selecting a result opens that member’s workspace; recent selections remain available for the current clinician.
- Roster provides member search, clinician/program filters, sortable columns, and direct workspace/Profile access. Columns adds clinician, height, body weight, and activity level to the default performance view.
- Programs separates reusable Templates from Assigned plans. Create/edit a template, assign an independent copy, and continue it through the shared session setup. Existing person-level New → Program creation remains available.
- Overview shows the latest result. History and Programs have their own member tabs. Continue program and New sit in the member header; Profile holds personal details and working settings.
- Start an assessment or training session, review settings, then begin. The mode picker explains each assessment or training option.
- Try Endurance (release-driven completion), Range of motion (detected or manual completion), and Eccentric in the shared flow.
- Use **Guided view** during a session. Coach takeover requires a demo PIN.
- **Skip to example results** opens a complete synthetic report. ROM settings stay pending until a coach reviews and applies them.
- Reports switch between force, stability, and paired symmetry on one large radial. Tap an angle for direction details, then explore its reps. Separate views hold the full direction table, history, and session notes. **Export** groups PDF / Print and CSV, with kg/lb/N and a chart-orientation preview. Email is shown as unavailable in the prototype. PDF includes all sections; CSV exports the same example data.
- Session history has compact radar previews: solid session measure, dotted stability, forward at top. Tap any row to open its report. Matching measures share a scale; incomplete sessions show a placeholder.
- In a report, **Explore reps** opens angle → compare reps → inspect a rep. Toggle traces, switch angles on the radial, and drag across the chart or use the time slider for exact samples. Isometric examples expose the stable window and all six detail metrics; print and CSV retain those values.
- Profile shows height, body weight, handedness, activity level, activity/sport, and goals. Clinicians can Edit, Save, or Cancel; members have a read-only view. These edits and drafts remain in browser memory, separate from assessed limits and session target force.
- Use Ella to explore a first assessment without a baseline.
- Switch clinicians: Sam **1111**, Jordan **2222**, clinic admin Casey **9999**. Casey can configure roster scope and default entry.
- **Try member entry** opens a private sign-in preview. Member demo code **2468** opens Alex; phone approval is simulated.

- Session setup has one row per direction. Edit tilt in the row, use **Apply Forward to all**, and change mode from the title. Endurance and Range of motion have **Finish the rep when** rules; Eccentric has speed and a force cap. Live reps end by those rules (simulated). Every mode has a **Challenge weight**: reps start counting only above it, and in Isokinetic it follows the target automatically (1 kg under) and the pad stops if effort stays below it. Earlier setup mockups are in `mockups/`.

## Boundaries

All people, authentication, permissions, force/movement readings, scoring, and device behavior are simulated. Data lives only in browser memory. Reports use illustrative fixtures, not captured session telemetry. Stable-window statistics describe generated example traces; window detection and stability scoring are not implemented. No hardware commands are sent. A production security model, sensor completion rules, calibrated ROM coordinates, clinical scoring, advanced multi-step program authoring, persistence, and native iPad implementation remain separate work.

## Verification

Browser checks at 1180 × 820 and 390 × 844: core session journey, guided takeover and private exit, first ROM approval state, assigned-only clinician roster, member isolation, endurance release, setup acknowledgement, and responsive overflow. JavaScript syntax checks: `node --check dist/app.js` `node --check dist/report.js`, `node --check dist/profile.js`, and `node --check dist/reps.js`. Browser simulation does not establish native iPad or hardware readiness.


The New flow starts with Assessment, Training session, or Program. Assessment includes all five modes; Training includes Isometric, Isokinetic, Eccentric, and Endurance. Programs support a simple repeated-mode plan with session-count progression, saved only in demo memory. The Overview radial retains stability and symmetry information.

## Rendered Isometric example

Open `/isometric-preview.html` for the standalone study, or choose Isometric in the New picker and use the enlarge control. The user preferred a rendered explanation over an interactive model viewer. This first example uses a generated soft technical render of a neutral mannequin: neutral head, forehead contact, fixed-position push, then release. Pause/Replay and step inspection are available in the full example. The picker loads an image and animation controller, with no WebGL or model download.

Isokinetic now also has a rendered example at `/isokinetic-preview.html`, integrated into both assessment and training pickers. The head approaches the sensor, then follows the pad while a single rigid arc rotates through the stationary holder. The rail never interpolates between different shapes or changes scale during animation. Neutral, Contact, Move and End controls pause at inspectable poses; Pause and Replay control the full sequence. Endurance, Eccentric and Range of motion now reuse the same rendered scenes with mode-specific motion and annotations.

The Isokinetic scene uses generated transparent parts and a stationary plate, saved under `dist/assets/renders/isokinetic-*.png`. Exact prompts are in `docs/isokinetic-render-prompts.txt`. The arc's rotation is deliberately rigid; the neck junction remains a blended 2D illustration rather than a fully rigged anatomical model. Range, speed and return are illustrative and are not hardware calibration.

The image is generated with built-in image_gen, using the supplied machine/contact image and soft technical style reference. Source asset: `dist/assets/renders/isometric-poses-v1.png`. Exact prompt: `docs/isometric-render-prompt.txt`. Two rendered poses are blended for approach/release, with a fixed sensor layer; effort changes only after contact. This is a concept animation, not a calibrated simulation or final continuously rendered video.

The earlier WebGL study remains at `/motion-study.html` as an unused reference. Its locally vendored Three.js files and original supplied GLB copy remain available; the user's source GLB and FBX are unchanged.


## Annotated mode picker

All five modes now use a short summary plus a larger annotated rendering. The modal has no separate caption, meter row or next-step paragraph. Blue shows user effort at the forehead; a rail-following arrow shows motion, with amber used for the opposing device movement in Eccentric. The effort HUD is qualitative and sits inside the scene. Endurance shows an untimed hold/release; ROM shows a stop-at-limit cue and retains coach review.

The corner controls pause or enlarge the example inside the current modal. **Back to modes** or Escape restores the same picker, selected person/mode, scroll position and playback state. A second Escape closes the picker. Standalone reference pages remain at `/isometric-preview.html?mode=endurance` and `/isokinetic-preview.html?mode=eccentric` (also `?mode=rom`). These are instructional concepts using existing rendered assets, not new hardware simulations.


The mode demonstrations run at **2× illustrative speed** (4.75–6.2 seconds per loop). Moving modes use a continuous generated mannequin layer with a deforming neck and fixed shoulders, replacing the detached neck blend. The arc still rotates as a rigid part. Source asset: `dist/assets/renders/isokinetic-person-v2.png`; built-in image_gen prompt: `docs/continuous-neck-render-prompt.txt`.


## Directional setup

Choose a mode from the setup dropdown, then review directions, reps and force. Tap the radial or a direction row to inspect its settings. Isokinetic defaults to **10–33° for rear/rear diagonals** and **5–33° elsewhere**. Start/end tilt can be edited per direction for this session and reset to its source. Valid applied personal degree limits override defaults when available; existing percentage-only profile data does not fabricate degree limits. Changes clear the review check, invalid ranges block Begin, and configured tilt is carried into the simulated session and result record.


Every mode now has an editable starting tilt: **10° at rear/rear diagonals, 5° elsewhere**. Isometric and Endurance hold that tilt during the rep; Isokinetic also exposes its end tilt. Eccentric and ROM keep their existing motion behavior. Edits are separate for each mode and direction and appear in the simulated live session.

## Report comparison

Reports now show changes beside the current results and overlay the previous comparable session by default. Blue solid = selected session; gray dashed = previous, with dates and a shared radial scale. Comparisons match person, mode, purpose, directions and reps. First sessions show a baseline, and unchanged/lower results are represented directly. Force symmetry uses average pair match in the headline; the original example score remains in detail.

Directions & reps adds a small Avg rep sparkline for each angle, using the same average trace as the detailed viewer and shared force/time scales. The traces have no axes or extra controls. Demo history includes a synthetic earlier Isometric assessment for the comparison example.

## Person-specific programs

A person’s **Programs** tab shows their assigned plan, completed visits, and upcoming sessions. The chart compares results and targets; filter by angle. Expand a completed row for the saved per-angle weights, results, notes, and report. Completed targets remain snapshots even when future plan settings change. Dynamic targets are calculated at setup from the assessment.

## Checks

Run from this directory with Node.js:

```sh
node review/session-tools-check.cjs
node review/mode-behavior-check.cjs
node review/person-programs-check.cjs
```

The redesign is independent of the `prototype/` route inventory and its verification harness. The existing GitHub Pages workflow still deploys engineering’s `prototype/`; this folder does not replace it. The separately hosted Sites copy excludes the unused WebGL model study because its model exceeds the host’s individual-file limit.

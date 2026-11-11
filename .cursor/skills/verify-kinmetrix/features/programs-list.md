# Programs list

The member opens the programs grid from Start → Run a Program, sees fixture programs, and can enter create-program choice.

## Sub-features

- `programs-open` reaches ProgramList from HomeStart.
- `programs-open-group` opens a program row into group list.
- `programs-create-entry` opens create-program choice via **+ Create New**.

## How to get to it (user POV)

- From Home, choose **Start**, then **Run a Program**.
- Or open `program-list.html` from a documented related link after Start.
- Choose a program name, or **+ Create New**.

## Driving it with verify-kinmetrix

Preconditions:

- Doctor is healthy.
- Prefer arrival via Home → Start → Run a Program (see member-start-session). Direct `goto program-list.html` is allowed only when proving list chrome in isolation; note that entry point in the artifact.

- **Arrive via Start.** `… goto home.html` → `… click --role link --name "Start"` → `… click --role link --name "Run a Program"`. `assert-route ProgramList` passes. Title **Programs** is visible.
- **Open a program.** Run `… click --role link --name "Neck strength - week 4"`. `assert-route GroupList` passes.
- **Create entry.** From ProgramList, run `… click --role link --name "Create New"`. `assert-route CreateProgramChoice` passes.
- **Proof.** `… snapshot --path programs/list.json` and `… screenshot --path programs/list.png` on ProgramList before leaving, plus a second pair after the chosen action.

## Gotchas

- Row **More actions** buttons are non-navigating stubs in HTML — do not treat a click with no route change as success.
- Create flow beyond the choice screen is a separate edit journey; stop at the mapped entry unless extending the map.

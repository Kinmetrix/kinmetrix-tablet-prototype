# Member start session

From member home analysis, the user starts a session and chooses an exercise type (assessment, smart session, or program).

## Sub-features

- `start-open` opens Select Exercise Type from Home.
- `start-assessment` reaches New Assessment (edit protocol session).
- `start-program` reaches the programs list from Run a Program.

## How to get to it (user POV)

- Be on member `home.html` (after sign-in layout, or Index → Member home).
- Choose **▶ Start** in the toolbar.
- Choose **New Assessment**, **Start Session**, or **Run a Program**.

## Driving it with verify-kinmetrix

Preconditions:

- Doctor is healthy.
- Start with `goto home.html` (or arrive via sign-in-layout).

- **Confirm home.** Run `… assert-route Home`. Visible analysis copy includes a latest-session date and **Start**.
- **Open start.** Run `… click --role link --name "Start"`. `assert-route HomeStart` passes. Title text `Select Exercise Type` is visible.
- **Assessment path.** Run `… click --role link --name "New Assessment"`. `assert-route EditProtocolSession` passes. Snapshot the result.
- **Program path (alternate).** From HomeStart, run `… click --role link --name "Run a Program"`. `assert-route ProgramList` passes.
- **Proof.** On HomeStart before leaving, or on the chosen destination: `… snapshot --path member-start/result.json` and `… screenshot --path member-start/result.png`. Proof must show Select Exercise Type or the chosen destination route — not only Home.

## Gotchas

- The Smart Session card is an `<article>` with an inner **Start Session** link; clicking the card body may not navigate. Prefer `--name "Start Session"` or `"Run a Program"` / `"New Assessment"`.
- `flow-nav` shortcuts on Home are secondary; prefer the toolbar **Start** control for this feature.
- Live run / device screens beyond this choice are placeholders — stop at the mapped destination unless another feature file continues.

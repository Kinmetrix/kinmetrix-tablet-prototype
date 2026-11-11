# Team roster to member

Team home lists roster members. Choosing a member opens the team-user surface toward that member’s home path.

## Sub-features

- `roster-open` shows the Demo team roster with search.
- `roster-open-member` opens a member row (Angele Test or Test User).
- `roster-compare-entry` exposes Compare from the team toolbar.

## How to get to it (user POV)

- Open `team-home.html` (Index → Team roster).
- Choose a member name in the Team members table.
- Optionally choose **Compare** or **New User** from the toolbar.

## Driving it with verify-kinmetrix

Preconditions:

- Doctor is healthy.

- **Open roster.** Run `… goto team-home.html`. `assert-route TeamHome` passes. Table `aria-label="Team members"` lists **Angele Test** and **Test User**.
- **Open member.** Run `… click --role link --name "Test User"`. `assert-route TeamUser` passes.
- **Continue to member home (if linked).** Follow the member page’s primary continue control into `home.html` when present; `assert-route Home`.
- **Proof.** `… snapshot --path team-roster/member.json` and `… screenshot --path team-roster/member.png` on TeamUser or Home after the click. Artifacts must show the member identity, not only TeamHome.

## Gotchas

- Multiple rows link to the same `team-user.html` fixture — assert visible name copy after navigation, not URL uniqueness.
- Search input `aria-label="Search members"` does not filter in the static HTML; typing there is not proof of filtering.
- Settings / Compare / New User are separate journeys; opening them does not complete `roster-open-member`.

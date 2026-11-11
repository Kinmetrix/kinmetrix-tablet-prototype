# Sign in (layout)

Sign in is a layout walkthrough only: the station shows the Kinmetrix landing, a password form with fixture credentials, and navigation into member home. There is no real authentication.

## Sub-features

- `signin-landing` shows the branded login landing with Get Started.
- `signin-password` opens the password form with Email Address and Password fields.
- `signin-submit` submits Log In and lands on member Home.

## How to get to it (user POV)

- Open `login.html` (or choose Login from `index.html`).
- Choose **Get Started**.
- Choose **Log In** on the password form (fixture values are prefilled).

## Driving it with verify-kinmetrix

Preconditions:

- `verify-kinmetrix doctor` reports `ownedByUs` and `homeUsable`.
- Session lastPath may be anything; this recipe starts with an explicit `goto`.

- **Open landing.** Run `node .cursor/skills/verify-kinmetrix/bin/verify-kinmetrix.mjs goto login.html`. `assert-route Login` passes. Visible text includes `Get Started` and the Kinmetrix logo alt text path.
- **Enter password screen.** Run `… click --role link --name "Get Started"`. `assert-route PasswordLogin` passes. Heading text `Log in to Kinmetrix` is visible.
- **Confirm fixture fields.** Run `… assert-text "Email Address"` and `… assert-text "Password"`. Optional: `… fill --id identifier --value "coach@example.com"` and `… fill --id password --value "password"` (already filled in HTML).
- **Submit.** Run `… click --role button --name "Log In"`. `assert-route Home` passes. Toolbar shows fixture member context (`Test User`) and a **Start** control.
- **Proof.** Run `… snapshot --path sign-in/after-login.json` and `… screenshot --path sign-in/after-login.png`. Artifacts show `data-route` Home and Start affordance.

## Gotchas

- Login does not gate the rest of the prototype; reaching Home via `goto home.html` does **not** prove this feature.
- Submit uses a GET form to `home.html`; query params may appear in `lastPath` — assert on `data-route`, not a bare pathname equality.
- Debug chrome / Index status bar is not part of the product path; leave it closed (`doctor`/helper already prefer closed drawers).

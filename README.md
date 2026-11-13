# Kinmetrix tablet prototypes

GitHub Pages serves a hub at the site root with four prototypes:

- [`kinmetrix-experience/`](kinmetrix-experience/) — interactive landscape iPad exploration
- [`kinmetrix-web-prototype/`](kinmetrix-web-prototype/) — phone-width member web app
- [`kinmetrix-prototype-oct13/`](kinmetrix-prototype-oct13/) — React clinic tablet prototype
- [`prototype/`](prototype/) — HTML screen inventory

The hub lives in [`site/index.html`](site/index.html). After deploy the cards open `/experience/`, `/web/`, `/oct13/`, and `/prototype/`.

## Run locally

Experience:

```sh
cd kinmetrix-experience
yarn install
yarn dev
```

Open http://localhost:4173.

Web: open `kinmetrix-web-prototype/index.html` in a browser.

Oct 13:

```sh
cd kinmetrix-prototype-oct13
yarn install
yarn dev
```

Open http://localhost:5173.

All session measurements are synthetic. Device operation, authentication, and clinical settings are demonstrations; this is not a production application.

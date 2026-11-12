# Kinmetrix tablet prototypes

Two independent explorations live in this repository:

- [`prototype/`](prototype/) — the existing engineering screen prototype. Its current GitHub Pages deployment is unchanged.
- [`kinmetrix-experience/`](kinmetrix-experience/) — the interactive experience redesign, including clinician/member navigation, assessments, training, reports, history, and person-specific programs.

## Run the experience redesign

```sh
cd kinmetrix-experience
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173. No install or build step is required. See its [README](kinmetrix-experience/README.md) for flows and prototype limitations.

All session measurements are synthetic. Device operation, authentication, and clinical settings are demonstrations; this is not a production application.

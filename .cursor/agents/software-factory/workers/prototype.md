# Prototype

Activity `Prototype`. Builds a clickable static prototype from the accepted PRD so the human can test flows before any production code exists.

## Brief

| Field | Use |
| --- | --- |
| `prdKey`, `prdVersion` | Accepted PRD: `<storeRoot>/<prdKey>`. |
| `context` | Platform and design constraints (viewport, design system, product context). They override generic web defaults. |
| `storeRoot`, `outputPrefix` | Write every file under `<storeRoot>/<outputPrefix>`. |
| `validationFeedback` | `null`, or `{Error, Cause}` from the last rejected prototype. Fix every problem it lists. |

## Build

1. One HTML file per screen, plus shared CSS and JS if needed. Use relative links only and no build step; the folder must open from disk.
2. Every screen traces to stories in the PRD. Include empty, loading, and error states the stories imply.
3. Write `prototype.json` next to the HTML:

```json
{
  "builtFromPrdVersion": "<prdVersion>",
  "entry": "index.html",
  "screens": [
    { "id": "dashboard", "file": "index.html", "stories": ["US-001", "US-002"] }
  ]
}
```

Write only under `<storeRoot>/<outputPrefix>`.

## Task output

```json
{ "outputPrefix": "<outputPrefix>", "summary": ["screens built and states covered"] }
```

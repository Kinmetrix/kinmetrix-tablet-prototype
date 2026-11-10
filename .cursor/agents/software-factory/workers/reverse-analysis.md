# Reverse analysis

Activity `ReverseAnalysis`. One stage of the read of an existing repo. Each stage builds on the reports before it.

## Brief

| Field | Use |
| --- | --- |
| `stage` | Which stage to run; see the table below. |
| `repo` | Directory to analyze, relative to the repository root. Read only; change nothing. |
| `analysisPrefix` | Earlier stage reports live under `<storeRoot>/<analysisPrefix>`. Read them all first. |
| `template` | Stage report template. Keep every `##` heading. |
| `storeRoot`, `outputKey` | Write the report to `<storeRoot>/<outputKey>`. |
| `validationFeedback` | `null`, or `{Error, Cause}` from the last rejected report. Fix every problem it lists. |

## Stages

| Stage | Find |
| --- | --- |
| `01-service-discovery` | Deployable units, entry points, package manifests, build and run scripts, environments. |
| `02-graph-extraction` | Pages and routes, components, API calls, and user actions, and how they connect. |
| `03-architecture` | Layers, boundaries, data flow, and state ownership. Include a mermaid diagram. |
| `04-data-model` | Entities, fields, and relationships from types, schemas, migrations, and fixtures. |
| `05-integrations` | External services, SDKs, environment variables, and network calls. If there are none, say where you looked. |
| `06-business-logic` | Rules, validations, calculations, and state transitions. |
| `07-ux-flows` | User journeys through the UI, plus screens, user flows, and routes from the router. |

## Write

- Under `## Evidence`, cite real files as backticked paths relative to `repo`, one bullet each. Line suffixes like `:42` are fine.
- Record what you observed. Put guesses under `## Open questions`, not `## Findings`.
- Remove every `{{…}}` placeholder.

Write only `<storeRoot>/<outputKey>`.

## Task output

```json
{ "outputKey": "<outputKey>", "summary": ["up to 5 bullets"] }
```

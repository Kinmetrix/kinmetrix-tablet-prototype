# PRD synthesis

Activity `PrdSynthesis`. Stage `08-prd-synthesis`: turns the seven stage reports into the PRD the code never had.

## Brief

| Field | Use |
| --- | --- |
| `repo` | The analyzed directory. |
| `analysisPrefix` | All seven stage reports under `<storeRoot>/<analysisPrefix>`. |
| `template` | PRD template. Keep every `##` heading. |
| `previousPrdKey` | Committed PRD this one supersedes, or `null`. |
| `storeRoot`, `outputKey` | Write the PRD to `<storeRoot>/<outputKey>`. |
| `validationFeedback` | `null`, or `{Error, Cause}` from the last rejected proposal. Fix every problem it lists. |

## Write

1. Fill each template section from the stage reports. Start any section the code cannot support (often market sizing) with `Generated, not found in code:`.
2. Write one story per behavior the code implements, as `### US-001: Title` with `Acceptance criteria:` bullets that describe what the code does today.
3. List dead code, half-built features, and contradictions under `## Open questions`. The human decides at review what to keep, remove, or add.
4. Start with front matter that sets `title`, and remove every `{{…}}` placeholder.

Write only `<storeRoot>/<outputKey>`.

## Task output

```json
{ "outputKey": "<outputKey>", "summary": ["up to 5 bullets"] }
```

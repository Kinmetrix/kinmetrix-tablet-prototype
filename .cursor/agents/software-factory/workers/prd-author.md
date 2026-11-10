# PRD author

Activity `PrdAuthor`. Turns a plain-language feature description into a complete PRD proposal.

## Brief

| Field | Use |
| --- | --- |
| `feature` | The request, verbatim. Do not drop any part of it. |
| `context` | Repo-relative docs to read first (product context, conventions, constraints). |
| `template` | PRD template. Keep every `##` heading. |
| `previousPrdKey` | Committed PRD this one supersedes, or `null`. Read it when set. |
| `storeRoot`, `outputKey` | Write the proposal to `<storeRoot>/<outputKey>`. |
| `validationFeedback` | `null`, or `{Error, Cause}` from the last rejected proposal. `Cause` is JSON; fix every problem in its `errorMessage`. |

## Write

1. Start with front matter that sets `title`. Do not set `version` or status; CommitPrd assigns them.
2. Fill every template section with content specific to this feature. Write `Not applicable: <reason>` instead of leaving a section empty.
3. Write stories as `### US-001: Title`, numbered from `US-001`, each with an `As a … I want … so that …` line, `Phase: 1` or `Phase: 2`, and an `Acceptance criteria:` line followed by `- ` bullets.
4. Put everything you could not infer under `## Open questions`. These are the questions the human answers at review.
5. Remove every `{{…}}` placeholder.

Write only `<storeRoot>/<outputKey>`.

## Task output

```json
{ "outputKey": "<outputKey>", "summary": ["up to 5 bullets"] }
```

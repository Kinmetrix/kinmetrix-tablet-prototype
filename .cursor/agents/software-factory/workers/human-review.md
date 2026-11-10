# Human review

Activity `HumanReview`. The human gate: a person approves the PRD version or asks for changes. You relay; you never decide.

## Brief

| Field | Use |
| --- | --- |
| `prdKey`, `prdVersion` | PRD under review: `<storeRoot>/<prdKey>`. |
| `round`, `maxRounds` | Revision rounds used so far and the limit for this execution. |
| `validationFeedback` | `null`, or why the last review output was rejected. |

## Relay

1. Read the PRD. Show the human a short summary: elevator pitch, story list by phase, and every item under `## Open questions`.
2. Ask with structured options: approve `v<prdVersion>`, or request changes. Say how many revision rounds remain (`maxRounds - round`).
3. On "request changes", collect the human's answers to the open questions and the changes they want, in their words.
4. Approval moves on to the prototype and code. Do not approve on the human's behalf, and do not treat silence or an unrelated reply as approval.

## Task output

```json
{ "decision": "approve", "reviewer": "<human's name>", "prdVersion": "<prdVersion>" }
```

```json
{ "decision": "revise", "reviewer": "<human's name>", "prdVersion": "<prdVersion>", "feedback": "<answers and requested changes, verbatim>" }
```

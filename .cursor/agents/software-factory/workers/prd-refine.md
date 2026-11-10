# PRD refine

Activity `PrdRefine`. Applies the reviewer's feedback to the committed PRD and proposes the next version.

## Brief

| Field | Use |
| --- | --- |
| `prdKey`, `prdVersion` | Committed PRD under review: `<storeRoot>/<prdKey>`. |
| `reviewFeedback`, `reviewer` | What the human asked for, verbatim. |
| `context`, `template` | Same docs and template the author used. |
| `storeRoot`, `outputKey` | Write the full revised PRD to `<storeRoot>/<outputKey>`. |
| `validationFeedback` | `null`, or `{Error, Cause}` from the last rejected proposal. Fix every problem it lists. |

## Write

1. Copy the committed PRD in full, then apply every point in `reviewFeedback`. Do not apply changes nobody asked for.
2. Keep story IDs stable. A new story takes the next unused ID. A removed story is deleted, never renumbered.
3. Move each answered open question into the section it affects and delete it from `## Open questions`.
4. Keep the front matter `title`. Drop `version`, `source`, `supersedes`, `execution`, and `committedAt`; CommitPrd rewrites them.

Write only `<storeRoot>/<outputKey>`.

## Task output

```json
{ "outputKey": "<outputKey>", "summary": ["one bullet per applied change"] }
```

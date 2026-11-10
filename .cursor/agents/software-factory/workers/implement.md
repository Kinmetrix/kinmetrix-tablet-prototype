# Implement

Activity `Implement`. Writes production code for the accepted, flow-locked PRD.

## Brief

| Field | Use |
| --- | --- |
| `prdKey`, `prdVersion` | Accepted PRD: `<storeRoot>/<prdKey>`. The stories and acceptance criteria are the spec. |
| `prototypeKey` | Committed prototype folder under `<storeRoot>`: the visual and flow reference. |
| `context` | Repo conventions and constraints. Also read the repo's `AGENTS.md` if it exists. |
| `codeRoots` | The only paths you may change. Anything else changed since the run started is rejected. |
| `storeRoot`, `reportKey` | Write the report to `<storeRoot>/<reportKey>`. |
| `validationFeedback` | `null`, or `{Error, Cause}`. `Factory.VerifyFailed` means the verify command failed: its `Cause` has the log tail and the full log key. Fix the cause, not the test. |

## Build

1. Implement every story in the PRD. Follow the repo's existing structure and conventions over the prototype's markup.
2. Add or update tests that prove the acceptance criteria where the repo has a test setup.
3. Change files only inside `codeRoots`. Do not commit; the human owns git history.
4. Write the report:

```json
{
  "builtFromPrdVersion": "<prdVersion>",
  "changedFiles": ["src/feature/Screen.tsx"],
  "storiesCovered": ["US-001"],
  "summary": ["up to 5 bullets"]
}
```

## Task output

```json
{ "reportKey": "<reportKey>", "summary": ["up to 5 bullets"] }
```

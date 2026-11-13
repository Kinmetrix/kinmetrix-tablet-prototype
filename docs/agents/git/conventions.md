# Git conventions

Commits, branches, and pull requests for this repo.

## Merge and titles

- Default: **squash merge** on GitHub.
- **PR title** = conventional **subject** (becomes the squash commit on the default branch).
- **PR description**: team template plus Linear magic words for issues not covered by the branch (below).

## Commit subject

```
<type>(<scope>): <imperative description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

- Imperative mood, ≤72 characters.
- Optional body; body lines ≤100 characters.
- Breaking: `type(scope)!: description` and `BREAKING CHANGE:` footer.
- **No** Linear issue id in the subject.

## Commit body (Linear)

Primary work links via **branch name**. Use the body for **secondary** issues:

```
feat(api): validate session payload

Fixes KMD-45
```

| Intent | Examples |
|--------|-----------|
| Close on merge | `Fixes KMD-45`, `Closes KMD-12, KMD-45` |
| Link only | `Refs KMD-45`, `relates to KMD-45` |

See [Linear GitHub integration](https://linear.app/docs/github).

Preflight:

```bash
printf '%s' "feat(scope): summary" | yarn commitlint
printf '%s' "feat(scope): summary\n\nFixes KMD-1" | yarn commitlint
```

If the hook fails, fix and retry. Never `git commit --no-verify`.

## Branches

Do not commit on **trunk** (main).

**Linear issue:** use Linear **Copy git branch name** (`Cmd/Ctrl+Shift+.`).

**No Linear issue:** `type/scope-description` (lowercase, hyphens, ~50 chars).

## Pull requests

- **Title:** same as commit subject.
- **Description:** secondary issues (`Fixes KMD-45, KMD-46`). Magic words in **PR comments do not link**.
- **Unlink branch auto-link:** `skip KMD-123` in the description.

## Agents

One logical commit when practical. Read `git status` and `git diff` before naming. Secondary `Fixes`/`Refs` go in commit body and/or PR description.

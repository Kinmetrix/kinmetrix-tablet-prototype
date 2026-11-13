# suggest-commit

Commit message assistant for **this product repository**. Rules: `docs/agents/git/conventions.md` and `.cursor/rules/git-conventions.mdc`.

## Step 0: Repository context

Default to **this repo’s git root**:
`git rev-parse --show-toplevel` (from the active file’s directory or current working directory).

The user may optionally provide:
- A **commit SHA** to reword (must belong to this repo)
- An **absolute path** to a different git root (monorepo or unusual layout only)

State **Repository** in the output (path + branch).

**Trunk / upstream:** Read trunk from `docs/agents/git/conventions.md`. Then
`git config branch.<current>.merge`, or first existing
`origin/<trunk>`, `origin/main`, `origin/development`, `origin/master`.

**Linear:** Primary link is the **branch name**; never put Linear ids in the subject. Use `Fixes TEAM-###` / `Refs` in the body/footer only when conventions call for a secondary link.

## Step 1: What to review

**SHA given:** `git show <SHA> --stat`, full show, current message via `git log -1`.

**No SHA:**
- Prefer **staged**: `git diff --cached --stat`, `git diff --cached`
- Else working tree; note if nothing is staged
- `git log <upstream>..HEAD --oneline` when useful

## Step 2: Analyze

Files, **type**, **scope** (from paths under this repo), breaking changes, 2–3 sentence summary.

## Step 3: Message

- Subject: `type(scope): imperative summary` — ≤72 chars, no Linear in subject
- Body: blank line after subject; lines ≤100; footer for `Fixes`/`Refs` when needed
- Preflight when possible: `printf '%s' "<message>" | yarn commitlint` (or `npm run commitlint`)

## Step 4: Output

**3 variant options** (mandatory), same staged diff, different emphasis:

```markdown
# Commit Message Options

## Context
- **Repository**: …
- **Branch**: …
- **Reviewed**: Staged | Unstaged | SHA
- **Files**: n (+/- lines)
- **Key changes**: …

## Option 1–3
(Each: fenced full message)

## Analysis
Type, scope, breaking change, Linear footer if any

## Files modified
```

## Rules

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Imperative subject. Reflect all reviewed changes. Never suggest `git commit --no-verify`.

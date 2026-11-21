---
name: commit-msg
description: Generate a commit message from the staged changes and commit them. Use when the user says "write a commit message", "generate a commit", "commit my changes", or runs /commit-msg. Commits only what is already staged; never stages files itself.
---

# commit-msg

Write a commit message for the **staged** changes and commit them.

## 1. Check for staged changes

Run:

```bash
git diff --staged --stat
```

If the output is empty, **stop**. Tell the user nothing is staged and to stage their changes first (for example `git add <files>`). Do not stage anything yourself, and do not commit.

## 2. Read the staged diff

```bash
git diff --staged
```

Only the staged diff counts. Ignore unstaged and untracked changes: they are not part of this commit. If the diff is very large, read `git diff --staged --stat` first, then read the files that matter most.

Before writing the message, check the staged paths against the monorepo rules in the root `CLAUDE.md`:

- If the staged changes include files under **both** `backend/` and `frontend/`, **stop**. Tell the user the project rules require separate commits for backend and frontend, and list which staged files belong to each app. Ask them to restage one app at a time. Do not commit.

## 3. Generate the message

Format:

```
type(scope): short subject

- bullet of what changed
- bullet of why
```

**type**: one of `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`.

| Type | Use for |
| --- | --- |
| `feat` | New user-facing or API behaviour |
| `fix` | Bug fix |
| `refactor` | Code change with no behaviour change |
| `chore` | Tooling, dependencies, config, setup |
| `docs` | Documentation only |
| `style` | Formatting only (no logic change) |
| `test` | Adding or changing tests only |

**scope**: follows the project convention `<app>/<feature or part>`:

- `backend/<part>` when the staged files are under `backend/`, for example `backend/auth`.
- `frontend/<part>` when they are under `frontend/`, for example `frontend/dashboard`.
- `repo/<part>` only when every staged file is at the root level (`README.md`, `CLAUDE.md`, `compose.yaml`, `docker/`, `docs/`, `.claude/`, and so on).
- Root-level files staged together with one app's files take that app's scope.

Pick `<part>` from the feature or area most of the diff touches: a short lowercase word such as `auth`, `api`, `products`, `setup` or `deps`.

**subject**:

- Under 60 characters for the whole first line, including `type(scope): `.
- Imperative mood ("add", "fix", "remove"), lowercase start, no trailing period.
- Describe the change, not the files.

**body** (optional but encouraged):

- One blank line after the subject.
- Short `- ` bullets: what changed, and why it changed.
- Leave the body out for trivial changes where the subject says it all.

**Never** add a `Co-Authored-By` trailer or any other AI attribution line.

## 4. Commit

Commit with the generated message. Pass it through a heredoc so newlines and quotes survive:

```bash
git commit -F - <<'EOF'
type(scope): short subject

- what changed
- why
EOF
```

Do not use `--no-verify` and do not amend unless the user asks. If a pre-commit hook fails, show the user the hook output and stop. Don't bypass the hook.

Afterwards, show the user the commit hash and the full message (`git log -1 --format='%h %B'`). Do not push unless they ask.

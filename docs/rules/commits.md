# Commit Rules

One-sentence purpose: Strict, checkable rules for commit messages and commit procedure.

## Format

Conventional Commits:

```text
type(scope): imperative summary
```

- Max 72 characters (including type, scope, colon, space, and summary)
- No trailing period
- Imperative mood ("add" not "added", "fix" not "fixed")

## Valid Types

| Type | Purpose |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactor (no behavior change) |
| `style` | Formatting, missing semicolons, etc. |
| `chore` | Build tasks, dependencies, config |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |

## Valid Scopes

| Scope | Purpose |
|-------|---------|
| `auth` | Authentication (login, signup, Google OAuth, JWT) |
| `ui` | Frontend UI components and pages |
| `api` | Backend API routes and handlers |
| `theme` | Theme tokens, colors, styling |
| `profile` | User profile and account settings |
| `trade` | Buy, sell, portfolio, stop-loss |
| `watchlist` | Watchlist CRUD |
| `market` | Market data, quotes, WebSocket |
| `deps` | Dependencies |
| `config` | Configuration files |

## Commit Rules

1. **One logical change per commit.** The app must build and work after every commit.
2. **Backend and frontend changes are split into separate commits.**
3. **Config/dependency changes go in their own commit.**
4. **Formatting-only changes are separate from logic changes.**
5. **Stage specific files only** — never `git add .`. Use `git add -p` when a file mixes concerns.
6. **Never commit:** `.env` files, secrets, `node_modules`, build output, logs, debug leftovers (`console.log`, commented-out code).
7. **No "Co-authored-by" lines and no AI mentions** in commit messages.

## Examples

Good:

```text
feat(auth): add Google OAuth callback route
fix(trade): handle insufficient margin error on short sell
docs(api): document stop-loss endpoint
style(ui): fix navbar padding on mobile
chore(deps): update zod to v4.6.7
```

Bad:

```text
fix bug
updated stuff
feat: added login page
fix(login): fixed login.
```

## Commit Procedure

1. Run `git status` and `git diff` to inspect all changes.
2. Group changes into logical units (e.g., backend auth change, frontend UI change, config change).
3. Show the plan to the user: list which files go in which commit and the proposed commit messages.
4. Commit in dependency order (e.g., config before code, backend before frontend if frontend depends on backend).
5. Use `git add <specific files>` then `git commit -m "type(scope): summary"`.
6. After committing, run `git log --oneline` and `git status` to verify.

---

**Last verified against code:** ESLint config, Prettier config (no commit hook configured yet).
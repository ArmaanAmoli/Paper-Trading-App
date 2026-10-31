# Git Workflow

One-sentence purpose: Branching, PR, and push rules for the Paper Trading App.

## Branch Naming

| Pattern | Purpose |
|---------|---------|
| `feat/...` | New feature |
| `fix/...` | Bug fix |
| `chore/...` | Chore, dependencies, config |
| `docs/...` | Documentation |
| `refactor/...` | Code refactor |

- One branch per task.
- Create branches from the `main` branch.

## Protected Branch Rules

- **Never commit directly to `main`.**
- **Never force-push, amend, or rebase shared history** without being asked.
- **Never push unless asked.** The user will explicitly request pushes.

## PR Checklist

Before submitting a PR:

- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Format check passes (`npm run format:check`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Tests pass (if any exist)
- [ ] Docs updated (any endpoint, model, env, or auth change has matching docs in `/docs`)
- [ ] No secrets committed
- [ ] No debug code (`console.log`, commented-out code)

---

**Last verified against code:** `.gitignore` (excludes `.env`, `node_modules`, `dist`), `package.json` scripts.
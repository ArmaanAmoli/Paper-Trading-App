# Code Quality

One-sentence purpose: Naming, code style, error handling, and quality rules for the Paper Trading App.

## General Rules

- **Naming:** Use descriptive names. `camelCase` for variables/functions, `PascalCase` for components and types, `kebab-case` for API routes.
- **File/folder naming:** Match existing conventions (`camelCase.ts`, `PascalCase.tsx` for React components).
- **Max function size:** Keep functions under ~50 lines; extract logic into helpers.
- **Max file size:** Keep files under ~300 lines; split into modules.
- **No dead code:** Remove unused imports, variables, and functions.
- **No commented-out code:** Delete it; use git history if needed.
- **No `console.log`** in committed code (debug only).
- **No magic numbers:** Use constants or config values.
- **Early returns** over deep nesting.
- **Handle every error path:** No silent failures.
- **Async/await with try/catch:** Always wrap async operations that can fail.
- **No silent catch blocks:** At minimum, log the error.

## Frontend Rules

- Use reusable components over copy-paste.
- Use the shared `Button`, `Input`, `PasswordInput` components.
- Every data-fetching view must have loading, empty, and error states.
- Accessible labels and `aria` attributes on all interactive elements.
- No inline styles when theme tokens exist (see `src/index.css` for `--bg`, `--surface`, `--border`, `--text`, etc.).

## Backend Rules

- **Thin routes:** Route handlers in `server/server.ts` should only parse input and call query manager functions.
- **Logic in services/controllers:** Business logic lives in `server/queryManager.ts`.
- **Validation on every input:** All endpoints use Zod schemas via the `route()` wrapper (`server/lib/route.ts`).
- **Consistent error handling:** One global error middleware in `server/server.ts`; custom error classes in `server/lib/errors.ts`.
- **Never trust client-supplied user IDs:** Always use the authenticated user from the JWT (`user.userId` from `route()` wrapper).

## Tooling

- **Linter:** ESLint (`eslint.config.js`) — run with `npm run lint`
- **Formatter:** Prettier (`.prettierrc.json`) — run with `npm run format`
- **Type check:** `npm run typecheck`

If none of these existed, the rule would be to report it and suggest one rather than adding silently. All three exist in this project.

---

**Last verified against code:** `eslint.config.js`, `.prettierrc.json`, `package.json` scripts, `server/lib/errors.ts`, `server/lib/route.ts`.
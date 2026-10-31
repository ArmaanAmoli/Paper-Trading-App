# Documentation Index

This folder contains the documentation for the Paper Trading App codebase.

## Start Here

1. [architecture.md](./architecture.md) — system overview, tech stack, folder structure, request flow
2. [setup.md](./setup.md) — prerequisites, install, running locally, ports
3. [environment.md](./environment.md) — all environment variables and secrets
4. [authentication.md](./authentication.md) — auth flow, cookies, middleware
5. [database.md](./database.md) — MongoDB models, schemas, relationships
6. [frontend.md](./frontend.md) — routing, components, state, API client, theme tokens
7. [api/README.md](./api/README.md) — API conventions and master endpoint table

## Rules

- [commits.md](./rules/commits.md) — commit message format and procedure
- [git-workflow.md](./rules/git-workflow.md) — branching, PRs, push policy
- [code-quality.md](./rules/code-quality.md) — naming, code style, error handling
- [api-conventions.md](./rules/api-conventions.md) — route naming, status codes, response envelope
- [testing.md](./rules/testing.md) — what to test, manual test checklist
- [security.md](./rules/security.md) — secrets, cookies, CORS, rate limiting

## Decision Records

- [decisions/README.md](./decisions/README.md) — how to write a decision record

---

**Last verified against code:** `server/server.ts`, `server/queryManager.ts`, `server/Schemas/mongoSchema.ts`, `src/AppRouter.tsx`, `src/services/api.ts`, `shared/contract/`, `.env.example`, `package.json`.
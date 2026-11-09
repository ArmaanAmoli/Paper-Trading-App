# Paper Trading App — Agent Instructions

## Project

A full-stack paper trading platform: React + Vite frontend (TypeScript), Express API (TypeScript), MongoDB, and a Python FastAPI service for real-time market data. Users trade with virtual money, track portfolios, set stop-losses, manage watchlists, and authenticate via email/password or Google OAuth.

## Commands

| Purpose | Command |
|---------|---------|
| Install deps | `npm install` |
| Dev frontend | `npm run dev` (Vite, port 5173) |
| Dev server | `npm run dev:server` (Express, port 3001) |
| Type check | `npm run typecheck` (app + server + node) |
| Lint | `npm run lint` (ESLint, max-warnings 0) |
| Lint fix | `npm run lint:fix` |
| Format | `npm run format` (Prettier) |
| Format check | `npm run format:check` |
| Build | `npm run build` (typecheck + vite build) |
| Server build | `npm run build:server` |
| Full check | `npm run check` (typecheck + lint + format:check + build) |

## Most Important Rules

- Before making changes, read the relevant docs in `/docs`.
- After changing endpoints, models, env vars, or auth, update the matching docs in `/docs` in the same change.
- Never commit `.env`, secrets, `node_modules`, build output, logs, or debug code.
- One logical change per commit; app must build and work after every commit.
- Backend and frontend changes go in separate commits.
- Conventional commits: `type(scope): summary` (max 72 chars, no period).
- Stage specific files only — never `git add .`.
- No AI mentions or Co-authored-by in commit messages.
- Never push unless explicitly asked.

## Key Links

- Docs index: `/docs/README.md`
- Rules: `/docs/rules/`
- API docs: `/docs/api/`
- Architecture: `/docs/architecture.md`
- Environment: `/docs/environment.md`
- Authentication: `/docs/authentication.md`
- Database: `/docs/database.md`
- Frontend: `/docs/frontend.md`

## Architecture Snapshot

- Frontend: `src/` — React Router, Context providers, Axios API client with Bearer token from `localStorage`
- Backend: `server/` — Express, `route()` Zod validation wrapper, `queryManager.ts` business logic, Mongoose schemas
- Shared contracts: `shared/contract/` — Zod schemas used by both frontend and backend
- Market data: `YahooFinanceDataPipeline/` — Python FastAPI service on ports 8000/8001
- Env: `.env` (gitignored), `.env.example` (template)
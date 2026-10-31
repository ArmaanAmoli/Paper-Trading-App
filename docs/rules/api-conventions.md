# API Conventions

One-sentence purpose: Route naming, HTTP method usage, status codes, response envelope, and documentation requirements for API endpoints.

## Route Naming

- Use **plural nouns** where applicable (e.g., `/user-watchlist`, not `/watchlist` — but this project uses existing conventions, so match what's in `server/server.ts`).
- Use **kebab-case** for paths.
- No API versioning is currently used.

## HTTP Method Usage

| Method | Use |
|--------|-----|
| `GET` | Retrieve data (no side effects) |
| `POST` | Create resource or trigger action (buy, sell, stop-loss, signup, login) |
| `DELETE` | Remove resource (delete account, delete watchlist item, cancel stop-loss) |
| `PUT`/`PATCH` | Not currently used |

## Status Code Usage

| Code | When |
|------|------|
| 200 | Success (implicit `res.json`) |
| 400 | Validation failed (Zod) or bad request |
| 401 | Missing/invalid/expired token |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Insufficient funds or insufficient margin |
| 500 | Internal server error |

## Standard Response Envelope

There is no single global envelope. Each endpoint returns its own JSON shape matching its Zod response schema. Errors follow `apiErrorSchema`:

```json
{
  "message": "string",
  "issues": []
}
```

## Auth Requirement Default

**Protected unless explicitly public.** Only `/sign-up`, `/login`, and Google OAuth routes are public (`auth: false` in the endpoint definition). All other endpoints require authentication.

## Documentation Rule

**Every new or changed endpoint MUST update its file in `docs/api/` in the same PR.** The endpoint table in `docs/api/README.md` and the resource-specific doc (e.g., `auth.md`, `trade.md`, `watchlist.md`, `market.md`) must reflect the change.

## Endpoint Documentation Template

```markdown
## METHOD /path

One-sentence description.

- **Auth required:** Yes/No
- **Request:** [params | query | body] — table of fields
- **Response (200):** JSON example and schema
- **Errors:** Status codes with error body and conditions
- **Side effects:** Database mutations, external calls, etc.
- **Schema:** Link to `shared/contract/*.ts`
- **Handler:** Function or file path
```

---

**Last verified against code:** `server/server.ts`, `server/lib/route.ts`, `shared/contract/define.ts`, `shared/contract/auth.ts`, `shared/contract/trade.ts`, `shared/contract/watchlist.ts`, `shared/contract/market.ts`.
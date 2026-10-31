# API Documentation

One-sentence purpose: API conventions, standard response shapes, and a master table of all endpoints.

## Base URL

- Development: `http://localhost:3001` (Express server)
- Frontend proxy: Vite proxies specific API paths to `http://localhost:3001` during development (see `vite.config.ts`)

## Auth Mechanism

- Protected endpoints require `Authorization: Bearer <token>` header.
- Token is a JWT signed with `JWT_SECRET`, expires in 1 hour.
- Token is obtained from `POST /login`, `POST /sign-up` (indirectly), or Google OAuth callback.
- Frontend stores token in `localStorage` under key `token`.

## Standard Response Shapes

### Success

Most endpoints return JSON directly. The `route()` wrapper in `server/lib/route.ts` calls `res.json(result)` where `result` is the handler's return value matching the Zod response schema.

### Error

```json
{
  "message": "string",
  "issues": []
}
```

Defined by `apiErrorSchema` in `shared/contract/define.ts` and `server/lib/errors.ts`. Validation errors (Zod) return 400 with `issues`. `AppError` subclasses return their `statusCode` and `message`.

## Status Code Conventions

| Code | Meaning |
|------|---------|
| 200 | Success (implicit via `res.json`) |
| 400 | Validation failed (Zod error) or bad request |
| 401 | Unauthorized (missing/invalid/expired token) |
| 403 | Forbidden |
| 404 | Not found (user, stop-loss, etc.) |
| 409 | Conflict |
| 422 | Insufficient funds or insufficient margin |
| 500 | Internal server error |

## Pagination / Filtering

Not used. All list endpoints return full arrays (trade history, portfolio, watchlist, stop-losses).

## Master Endpoint Table

| Method | Path | Auth Required | Description | Doc Link |
|--------|------|---------------|-------------|----------|
| POST | `/sign-up` | No | Register a new user | [auth.md](./auth.md) |
| POST | `/login` | No | Email/password login, returns JWT | [auth.md](./auth.md) |
| GET | `/api/auth/google` | No | Start Google OAuth flow | [authentication.md](../authentication.md) |
| GET | `/api/auth/google/callback` | No | Google OAuth callback | [authentication.md](../authentication.md) |
| GET | `/user-data` | Yes | Get authenticated user's account data | [auth.md](./auth.md) |
| POST | `/save-subscription` | Yes | Save push notification subscription | [auth.md](./auth.md) |
| DELETE | `/user/me` | Yes | Delete account and all associated data | [auth.md](./auth.md) |
| GET | `/quote` | Yes | Get current quote for a ticker | [market.md](./market.md) |
| GET | `/data` | Yes | Get OHLCV data for a ticker | [market.md](./market.md) |
| GET | `/search` | Yes | Search tickers | [market.md](./market.md) |
| GET | `/data/indicator` | Yes | Get technical indicator data | [market.md](./market.md) |
| GET | `/portfolio` | Yes | Get user's portfolio positions | [trade.md](./trade.md) |
| GET | `/trade-history` | Yes | Get user's trade history | [trade.md](./trade.md) |
| GET | `/user-watchlist` | Yes | Get user's watchlist | [watchlist.md](./watchlist.md) |
| POST | `/user-watchlist/add` | Yes | Add symbol to watchlist | [watchlist.md](./watchlist.md) |
| DELETE | `/user-watchlist/delete` | Yes | Remove symbol from watchlist | [watchlist.md](./watchlist.md) |
| POST | `/buy` | Yes | Place a buy order | [trade.md](./trade.md) |
| POST | `/sell` | Yes | Place a sell order | [trade.md](./trade.md) |
| POST | `/stopLoss` | Yes | Place a stop-loss order | [trade.md](./trade.md) |
| GET | `/stopLoss` | Yes | Get user's active stop-losses | [trade.md](./trade.md) |
| DELETE | `/stopLoss/:id` | Yes | Cancel a stop-loss order | [trade.md](./trade.md) |

## Endpoint Validation

All endpoints use the `route()` wrapper which validates params, query, and body against Zod schemas defined in `shared/contract/`. Response validation occurs in development mode only.

---

**Rule:** Every new or changed endpoint MUST update its file in `docs/api/` in the same PR.

---

**Last verified against code:** `server/server.ts`, `shared/contract/auth.ts`, `shared/contract/trade.ts`, `shared/contract/watchlist.ts`, `shared/contract/market.ts`, `shared/contract/push.ts`, `shared/contract/define.ts`.
# Security

One-sentence purpose: Security rules for secrets, cookies, input validation, CORS, and auth-related changes.

## Secrets Handling

- **Never commit `.env` files.** `.env` is in `.gitignore`.
- `.env.example` must list every variable with placeholder values.
- Never log tokens, authorization codes, or secrets to the console.
- JWT secret (`JWT_SECRET`) must be at least 32 characters (enforced by Zod schema in `server/lib/env.ts`).

## Cookie Settings

| Cookie | httpOnly | sameSite | secure | path | maxAge |
|--------|----------|----------|--------|------|--------|
| `access_token` | Yes | lax | production only | `/` | 15 minutes |
| `refresh_token` | Yes | lax | production only | `/auth` | 7 days |
| `google_oauth_tx` | Yes | lax | production only | `/` | 10 minutes |

- Cookie options are centralized in `server/lib/cookies.ts`; clearing uses matching attributes.
- `google_oauth_tx` only holds an opaque transaction id — the PKCE verifier and state live server-side in the `OAuthTransaction` collection. It is cleared immediately after the callback.
- JWTs are stored **only** in HttpOnly cookies, never in `localStorage` or URLs.

## Token Handling

- **Never store tokens in `localStorage`** — sessions are HttpOnly cookies (`access_token`, `refresh_token`); the frontend sends them automatically via `withCredentials` / `credentials: 'include'`.
- Never log tokens or authorization codes. Authorization codes and refresh tokens are stored only as SHA-256 hashes (`server/lib/authStore.ts`).
- Protected endpoints read the `access_token` cookie via `verifyToken` (`server/lib/auth.ts`); `Authorization: Bearer` headers are not used.
- On 401, the frontend attempts one `POST /auth/refresh` (cookie-based) and retries; if that fails it redirects to login.
- WS tickets (`scope: 'ws'` JWTs from `POST /auth/ws-ticket`) are rejected as API access tokens.

## CSRF

- `csrfMiddleware` (`server/lib/csrf.ts`) enforces an Origin/Referer allowlist on all state-changing requests (POST/PUT/PATCH/DELETE), built from `FRONTEND_URL`, `VITE_API_BASE_URL`, and `PRODUCTION_FRONTEND_URL` (production) — SameSite=Lax cookies alone do not protect cross-site POSTs.

## Input Validation

- Every API endpoint validates params, query, and body via Zod schemas (`server/lib/route.ts`).
- Validation errors return 400 with details.
- The `route()` wrapper also validates responses in development mode.
- Password minimum length: 8 characters (enforced in `shared/contract/auth.ts`).
- Username: min 3, max 30 characters.

## CORS Configuration

- `cors()` in `server/server.ts` uses an explicit origin allowlist (`buildAllowedOrigins()` in `server/lib/csrf.ts`) with `credentials: true` — no wildcard, so cookies are only sent from allowed origins.

## Rate Limiting

- `rateLimit` (`server/lib/rateLimit.ts`) is an in-memory fixed-window limiter applied to `/auth/*` (30 req/min per IP+path) and `/api/auth/google` (20 req/min). Note: per-process only; a multi-instance deployment needs a shared store.

## Auth-Related Changes

**Any auth-related change requires re-testing all login flows:** email/password login, signup, Google OAuth, persistent session, logout, and delete account.

---

**Open Questions / Known Gaps**

- No email verification for new accounts.
- The in-memory rate limiter is per-process (not shared across instances).

---

**Last verified against code:** `server/server.ts`, `server/lib/googleAuth.ts`, `server/lib/auth.ts`, `src/services/api.ts`, `shared/contract/auth.ts`, `.env.example`.
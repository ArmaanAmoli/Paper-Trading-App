# Security

One-sentence purpose: Security rules for secrets, cookies, input validation, CORS, and auth-related changes.

## Secrets Handling

- **Never commit `.env` files.** `.env` is in `.gitignore`.
- `.env.example` must list every variable with placeholder values.
- Never log tokens, authorization codes, or secrets to the console.
- JWT secret (`JWT_SECRET`) must be at least 32 characters (enforced by Zod schema in `server/lib/env.ts`).

## Cookie Settings

| Cookie | httpOnly | sameSite | secure | maxAge |
|--------|----------|----------|--------|--------|
| `google_oauth_state` | Yes | lax | production only | 10 minutes |
| `google_oauth_origin` | Yes | lax | production only | 10 minutes |

- OAuth state cookies are cleared immediately after the callback.
- JWTs are **not** stored in cookies; they are in `localStorage` on the frontend (see known gap in [authentication.md](../authentication.md)).

## Token Handling

- **Never store the token in `localStorage`** — but the current code does (`src/services/api.ts`, `src/pages/login.tsx`). This is a known gap to fix.
- Never log tokens or authorization codes.
- Tokens are sent as `Authorization: Bearer <token>` headers.
- On 401, the frontend removes the token and redirects to login.

## Input Validation

- Every API endpoint validates params, query, and body via Zod schemas (`server/lib/route.ts`).
- Validation errors return 400 with details.
- The `route()` wrapper also validates responses in development mode.
- Password minimum length: 8 characters (enforced in `shared/contract/auth.ts`).
- Username: min 3, max 30 characters.

## CORS Configuration

- `cors()` middleware is applied globally in `server/server.ts` (no custom options — allows all origins by default).
- This is a potential security concern for production.

## Rate Limiting

- **No rate limiting is currently implemented.** This is a known gap.

## Auth-Related Changes

**Any auth-related change requires re-testing all login flows:** email/password login, signup, Google OAuth, persistent session, logout, and delete account.

---

**Open Questions / Known Gaps**

- CORS allows all origins by default.
- No rate limiting on auth endpoints (brute-force protection).
- JWT stored in `localStorage` (XSS risk).
- No refresh token mechanism.
- No email verification for new accounts.

---

**Last verified against code:** `server/server.ts`, `server/lib/googleAuth.ts`, `server/lib/auth.ts`, `src/services/api.ts`, `shared/contract/auth.ts`, `.env.example`.
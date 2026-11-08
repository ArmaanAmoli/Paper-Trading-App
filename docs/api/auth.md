# Auth Endpoints

One-sentence purpose: Documents all authentication-related API endpoints.

## POST /sign-up

Register a new user.

- **Auth required:** No
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `email` | string | Yes | Must be a valid email |
  | `password` | string | Yes | Minimum 8 characters |
  | `username` | string | Yes | Min 3, max 30 characters |
- **Response (200):** `{ message: 'User Registered' }`
- **Errors:** 400 if validation fails; 500 on server error
- **Schema:** `signUpEndpoint` in `shared/contract/auth.ts`
- **Handler:** `SignUp` in `server/queryManager.ts`
- **Side effects:** Creates a `User` document with `passwordHash` (bcrypt, salt 10), default balance 1,000,000, `authProvider: 'local'`.

## POST /auth/login (PKCE step 1)

Email/password login, step 1 of the PKCE flow. Validates credentials and returns a one-time authorization code bound to the client's `code_challenge`.

- **Auth required:** No
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `email` | string | Yes | Must be a valid email |
  | `password` | string | Yes | Min 1 character |
  | `code_challenge` | string | Yes | 43–128 chars, base64url |
  | `code_challenge_method` | string | Yes | Literal `'S256'` (`plain` is rejected) |
- **Response (200):** `{ message: 'Login Success', code: string }` — the plaintext code is returned exactly once; only its SHA-256 hash is stored (`AuthCode`, 90-second TTL)
- **Errors:** 400 validation failed / Google-only account; 401 wrong password or unknown user
- **Schema:** `loginPkceEndpoint` in `shared/contract/auth.ts`
- **Handler:** Inline in `server/server.ts` via `login()` in `server/queryManager.ts` + `createAuthCode` in `server/lib/authStore.ts`

## POST /auth/token (PKCE step 2)

Exchanges the one-time code + `code_verifier` for the session cookies.

- **Auth required:** No
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `code` | string | Yes | Min 1 character |
  | `code_verifier` | string | Yes | 43–128 chars, base64url |
- **Response (200):** `{ message: 'Tokens issued' }` plus `Set-Cookie` headers: `access_token` (JWT, 15 min, HttpOnly, path `/`) and `refresh_token` (UUID, 7 days, HttpOnly, path `/auth`). No tokens in the body.
- **Errors:** 400 invalid `code_verifier` format; 401 invalid/expired/reused code or verifier mismatch (`code_verifier does not match the authorization code`)
- **Schema:** `tokenExchangeEndpoint` in `shared/contract/auth.ts`
- **Handler:** Inline in `server/server.ts` via `consumeAuthCode` (`server/lib/authStore.ts`) + `issueSession` (`server/lib/session.ts`)
- **JWT payload:** `{ userId: string, email: string }`, expires in 15 minutes

## POST /auth/refresh

Rotates the refresh token and issues a new access token. Requires the `refresh_token` cookie.

- **Auth required:** No (cookie-based)
- **Request body:** none
- **Response (200):** `{ message: 'Token refreshed' }` + fresh `Set-Cookie` for both cookies
- **Errors:** 401 if the cookie is missing/invalid, or if a revoked token is reused (reuse revokes the whole token family)
- **Schema:** `refreshEndpoint` in `shared/contract/auth.ts`
- **Handler:** `rotateSession` in `server/lib/session.ts` + `rotateRefreshToken` in `server/lib/authStore.ts`

## POST /auth/logout

Revokes the refresh-token family and clears both session cookies.

- **Auth required:** No (cookie-based)
- **Request body:** none
- **Response (200):** `{ message: 'Logged out' }` + expired `Set-Cookie` headers
- **Schema:** `logoutEndpoint` in `shared/contract/auth.ts`
- **Handler:** `clearSession` in `server/lib/session.ts`

## POST /auth/ws-ticket

Issues a short-lived (5-minute) JWT with `scope: 'ws'` for authenticating the market-data WebSocket handshake as a subprotocol.

- **Auth required:** Yes (via the `access_token` cookie)
- **Request body:** none
- **Response (200):** `{ ticket: string }`
- **Errors:** 401 if unauthenticated; the ticket itself is rejected as an API access token
- **Schema:** `wsTicketEndpoint` in `shared/contract/auth.ts`
- **Handler:** `issueWsTicket` in `server/lib/session.ts`

## GET /api/auth/google and GET /api/auth/google/callback

Google OAuth with server-side PKCE (S256) and state. The verifier/state are stored server-side in an `OAuthTransaction` document; the browser only holds an opaque `google_oauth_tx` HttpOnly cookie (10 min). On success the session cookies are set and the user is redirected to the frontend origin with no token in the URL; on failure to `<origin>/?error=google_failed`. See [authentication.md](../authentication.md).

## GET /user-data

Get authenticated user's account data.

- **Auth required:** Yes
- **Request:** No params, query, or body
- **Response (200):**
  | Field | Type | Notes |
  |-------|------|-------|
  | `_id` | string | User ID |
  | `username` | string | |
  | `email` | string | |
  | `balance` | number | Default 1,000,000 |
  | `blockedMargin` | number | Default 0 |
  | `createdAt` | string | ISO date string |
  | `lastLogin` | string | null | ISO date string |
  | `notificationSubscription` | object | null | `{ endpoint, expirationTime, keys: { p256dh, auth } }` |
  | `googleId` | string | null | optional | |
  | `authProvider` | `'local' | 'google'` | optional | |
  | `avatar` | string | null | optional | |
- **Errors:** 404 if user not found; 401 if unauthenticated
- **Schema:** `userDataEndpoint` in `shared/contract/auth.ts`
- **Handler:** `GetUserData` in `server/queryManager.ts`

## POST /save-subscription

Save a push notification subscription for the authenticated user.

- **Auth required:** Yes
- **Request body:**
  | Field | Type | Required |
  |-------|------|----------|
  | `data.endpoint` | string | Yes |
  | `data.expirationTime` | number | null | Yes |
  | `data.keys.p256dh` | string | Yes |
  | `data.keys.auth` | string | Yes |
- **Response (200):** `{ success: true }`
- **Errors:** 404 if user not found; 401 if unauthenticated
- **Schema:** `saveSubscriptionEndpoint` in `shared/contract/auth.ts` (also in `push.ts`)
- **Handler:** `saveSubscription` in `server/queryManager.ts`

## DELETE /user/me

Delete the authenticated user's account and all associated data.

- **Auth required:** Yes
- **Request:** No body
- **Response (200):** `{ message: 'Account deleted successfully' }`
- **Errors:** 404 if user not found; 401 if unauthenticated
- **Schema:** `deleteAccountEndpoint` in `shared/contract/auth.ts`
- **Handler:** `deleteUser` in `server/queryManager.ts`
- **Side effects:** Revokes all `RefreshToken` documents and outstanding `AuthCode` documents for the user, then deletes all `Trade`, `Portfolio`, `Watchlist`, and `StopLoss` documents and the `User` document (in a transaction).

---

**Last verified against code:** `server/server.ts`, `server/queryManager.ts`, `shared/contract/auth.ts`.
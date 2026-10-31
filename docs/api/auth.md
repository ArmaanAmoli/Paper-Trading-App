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

## POST /login

Email/password login. Returns a JWT.

- **Auth required:** No
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `email` | string | Yes | Must be a valid email |
  | `password` | string | Yes | Min 1 character |
- **Response (200):** `{ message: 'Login Success', token: string }`
- **Errors:** 400 if user uses Google-only login; 401 if password doesn't match; 500 on server error
- **Schema:** `loginEndpoint` in `shared/contract/auth.ts`
- **Handler:** Inline in `server/server.ts`
- **JWT payload:** `{ userId: string, email: string }`, expires in 1 hour

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
- **Side effects:** Deletes all `Trade`, `Portfolio`, `Watchlist`, and `StopLoss` documents for the user, then deletes the `User` document.

---

**Last verified against code:** `server/server.ts`, `server/queryManager.ts`, `shared/contract/auth.ts`.
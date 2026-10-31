# Watchlist Endpoints

One-sentence purpose: Documents all watchlist-related API endpoints.

## GET /user-watchlist

Get the authenticated user's watchlist.

- **Auth required:** Yes
- **Request:** No params, query, or body
- **Response (200):** Array of `{ _id, userId, symbols: string[] }`
- **Errors:** 401 if unauthenticated; 500 on server error
- **Schema:** `userWatchlistEndpoint` in `shared/contract/watchlist.ts`
- **Handler:** `GetUserWatchlist` in `server/queryManager.ts`
- **Note:** Returns empty array `[]` if no watchlist document exists.

## POST /user-watchlist/add

Add a symbol to the user's watchlist.

- **Auth required:** Yes
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `symbol` | string | Yes | Min 1 character |
- **Response (200):** `{ success: true }`
- **Errors:** 400 if validation fails; 401 if unauthenticated; 500 on server error
- **Schema:** `addToWatchlistEndpoint` in `shared/contract/watchlist.ts`
- **Handler:** `AddToWatchlist` in `server/queryManager.ts`
- **Side effects:** Uses `$addToSet` with upsert, so duplicates are ignored and the document is created if it doesn't exist.

## DELETE /user-watchlist/delete

Remove a symbol from the user's watchlist.

- **Auth required:** Yes
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `symbol` | string | Yes | Min 1 character |
- **Response (200):** `{ success: true }`
- **Errors:** 400 if validation fails; 401 if unauthenticated; 500 on server error
- **Schema:** `deleteFromWatchlistEndpoint` in `shared/contract/watchlist.ts`
- **Handler:** `RemoveFromWatchlist` in `server/queryManager.ts`
- **Side effects:** Uses `$pull` to remove the symbol from the `symbols` array.

---

**Last verified against code:** `server/server.ts`, `server/queryManager.ts`, `shared/contract/watchlist.ts`.
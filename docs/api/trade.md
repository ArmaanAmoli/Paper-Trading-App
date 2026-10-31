# Trade Endpoints

One-sentence purpose: Documents all trading-related API endpoints (buy, sell, stop-loss, portfolio, trade history).

## POST /buy

Place a buy order.

- **Auth required:** Yes
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `symbol` | string | Yes | Min 1 character |
  | `qty` | number | Yes | Must be positive |
  | `side` | string | Yes | Enum: `['buy', 'sell']` |
- **Response (200):** `{ success: true, message: 'Buy order executed successfully', trade: { ... } | null, duplicate?: boolean }`
- **Trade object:** `{ _id, userId, symbol, shares, price, type, timestamp, realizedPL, orderId, wasStopLoss }`
- **Errors:** 400 if missing fields; 401 if unauthenticated; 422 if insufficient funds; 500 on server error
- **Schema:** `buyEndpoint` in `shared/contract/trade.ts`
- **Handler:** Inline in `server/server.ts` (calls `executeTrade` in `server/queryManager.ts`)
- **Side effects:** Fetches current price from FastAPI, updates portfolio position, deducts cash from balance, creates `Trade` record. Duplicate `orderId` is ignored.

## POST /sell

Place a sell order.

- **Auth required:** Yes
- **Request body:** Same as buy (`symbol`, `qty`, `side`)
- **Response (200):** `{ success: true, message: 'Sell order executed successfully', trade: { ... } | null }`
- **Errors:** 400 if missing fields; 401 if unauthenticated; 422 if insufficient funds/margin; 500 on server error
- **Schema:** `sellEndpoint` in `shared/contract/trade.ts`
- **Handler:** Inline in `server/server.ts`
- **Side effects:** Same as buy, but adds cash to balance. Handles position closing, flipping, and margin release for short positions.

## POST /stopLoss

Place a stop-loss order.

- **Auth required:** Yes
- **Request body:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `symbol` | string | Yes | Min 1 character |
  | `price` | number | Yes | Must be positive |
  | `startDate` | string | Yes | ISO date string |
  | `qty` | number | Yes | Must be positive |
  | `type` | string | Yes | Enum: `['buy', 'sell']` |
- **Response (200):** `{ message: 'Stop loss order placed.' }`
- **Errors:** 400 if validation fails; 401 if unauthenticated; 500 on server error
- **Schema:** `stopLossEndpoint` in `shared/contract/trade.ts`
- **Handler:** Inline in `server/server.ts` (saves `StopLoss` document, updates in-memory map, subscribes to WebSocket if needed)
- **Side effects:** Creates `StopLoss` document; subscribes to FastAPI WebSocket for the ticker if not already subscribed.

## GET /stopLoss

Get the authenticated user's active stop-loss orders.

- **Auth required:** Yes
- **Request:** No params, query, or body
- **Response (200):** Array of `{ _id, userId, symbol, price, startDate, type, qty }`
- **Errors:** 401 if unauthenticated; 500 on server error
- **Schema:** `getStopLossEndpoint` in `shared/contract/trade.ts`
- **Handler:** `getUserStopLosses` in `server/queryManager.ts`

## DELETE /stopLoss/:id

Cancel a stop-loss order.

- **Auth required:** Yes
- **URL params:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `id` | string | Yes | Min 1 character |
- **Response (200):** `{ message: 'Stop loss cancelled' }`
- **Errors:** 404 if stop-loss not found; 401 if unauthenticated; 500 on server error
- **Schema:** `deleteStopLossEndpoint` in `shared/contract/trade.ts`
- **Handler:** Inline in `server/server.ts` (calls `deleteStopLoss` in `server/queryManager.ts`)
- **Side effects:** Deletes `StopLoss` document; updates in-memory map; unsubscribes from WebSocket if no more stop-losses for that ticker.

## GET /portfolio

Get the authenticated user's portfolio positions.

- **Auth required:** Yes
- **Request:** No params, query, or body
- **Response (200):** `{ count: number, positions: [ { _id, userId, symbol, shares, avgPrice, positionType, lastUpdated } ] }`
- **Errors:** 401 if unauthenticated; 500 on server error
- **Schema:** `portfolioEndpoint` in `shared/contract/trade.ts`
- **Handler:** `portfolio` in `server/queryManager.ts`

## GET /trade-history

Get the authenticated user's trade history.

- **Auth required:** Yes
- **Request:** No params, query, or body
- **Response (200):** Array of `{ _id, userId, symbol, shares, price, type, timestamp, realizedPL, orderId, wasStopLoss }` (most recent first)
- **Errors:** 401 if unauthenticated; 500 on server error
- **Schema:** `tradeHistoryEndpoint` in `shared/contract/trade.ts`
- **Handler:** `GetTradeHistory` in `server/queryManager.ts`

---

**Last verified against code:** `server/server.ts`, `server/queryManager.ts`, `shared/contract/trade.ts`.
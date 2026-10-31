# Market Data Endpoints

One-sentence purpose: Documents all market data API endpoints (quote, OHLCV, search, indicators).

## GET /quote

Get current quote for a ticker.

- **Auth required:** Yes
- **Query params:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `ticker` | string | Yes | Min 1 character |
- **Response (200):** `{ ticker, currentPrice, change, percentChange }`
- **Errors:** 400 if validation fails; 401 if unauthenticated; 500 on server error
- **Schema:** `quoteEndpoint` in `shared/contract/market.ts`
- **Handler:** Inline in `server/server.ts` (proxies to FastAPI `GET /quote`)

## GET /data

Get OHLCV (candlestick) data for a ticker.

- **Auth required:** Yes
- **Query params:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `ticker` | string | Yes | Min 1 character |
  | `period` | string | Yes | — |
  | `interval` | string | Yes | — |
- **Response (200):** Array of `{ Date, Open, High, Low, Close, Volume }`
- **Errors:** 400 if validation fails; 401 if unauthenticated; 500 on server error
- **Schema:** `dataEndpoint` in `shared/contract/market.ts`
- **Handler:** Inline in `server/server.ts` (proxies to FastAPI `GET /data`)

## GET /search

Search for tickers.

- **Auth required:** Yes
- **Query params:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `query` | string | Yes | Min 1 character |
- **Response (200):** Array of ticker search results (shape varies; passthrough schema)
- **Errors:** 400 if validation fails; 401 if unauthenticated; 500 on server error
- **Schema:** `searchEndpoint` in `shared/contract/market.ts`
- **Handler:** Inline in `server/server.ts` (proxies to FastAPI `GET /search`)

## GET /data/indicator

Get technical indicator data.

- **Auth required:** Yes
- **Query params:**
  | Field | Type | Required | Validation |
  |-------|------|----------|------------|
  | `ticker` | string | Yes | Min 1 character |
  | `indicator` | string | Yes | Enum: `['SMA', 'EMA', 'RSI', 'VOL', 'OBV', 'BBAND', 'STOCH']` |
  | `interval` | string | Yes | — |
  | `period` | string | Yes | — |
  | `timeperiod` | number | No | — |
  | `matype` | boolean | No | — |
  | `stdUp` | number | No | — |
  | `stdDown` | number | No | — |
  | `fastPeriod` | number | No | Default 5 |
  | `slowkPeriod` | number | No | Default 3 |
  | `slowkMatype` | number | No | Default 0 |
  | `slowdPeriod` | number | No | Default 3 |
  | `slowdMatype` | number | No | Default 0 |
- **Response (200):** Varies by indicator (array of records, or object with UP/MIDDLE/DOWN, or SLOWK/SLOWD)
- **Errors:** 400 if validation fails; 401 if unauthenticated; 500 on server error
- **Schema:** `indicatorEndpoint` in `shared/contract/market.ts`
- **Handler:** Inline in `server/server.ts` (proxies to FastAPI `GET /data/indicator`)

---

**Note:** All market data endpoints proxy to the Python FastAPI service (`FAST_API_SERVER_DOMAIN`). The FastAPI service must be running for these endpoints to work.

---

**Last verified against code:** `server/server.ts`, `server/lib/pythonClient.ts`, `shared/contract/market.ts`.
# Paper Trading App - TypeScript Migration Progress

## Phase 0: Recon and baseline (no source changes)

- [x] 0.1 Create branch `chore/typescript-migration`
- [x] 0.2 Create MIGRATION.md with checklist
- [x] 0.3 Inventory all source files
- [x] 0.4 Record route table, client call table, WebSocket table, env table, data model
- [x] 0.5 Find where server dependencies are declared
- [ ] 0.6 Baseline: run npm ci, lint, build
- [ ] 0.7 Check if MongoDB and Python service can run

## Phase 1: Formatting, TypeScript, and lint tooling

- [ ] 1.1 Install Prettier, add config, run prettier --write
- [ ] 1.2 Install TypeScript tooling (typescript, tsx, zod, @types/*, typescript-eslint, eslint-config-prettier, prettier)
- [ ] 1.3 Create tsconfig.json, tsconfig.app.json, tsconfig.server.json, tsconfig.node.json
- [ ] 1.4 Convert vite.config.js -> vite.config.ts with @shared alias
- [ ] 1.5 Update eslint.config.js with typescript-eslint config
- [ ] 1.6 Add scripts: typecheck, lint, format, format:check, build, check
- [ ] 1.7 Add *.tsbuildinfo to .gitignore
- [ ] 1.8 Gate: typecheck && lint && format:check && build all pass (with JS code)

## Phase 2: Shared Zod contract

- [ ] 2.1 Create shared/ directory structure
- [ ] 2.2 Create defineEndpoint helper and error schema
- [ ] 2.3 Create contract files per domain (auth, trade, portfolio, watchlist, market, push)
- [ ] 2.4 Create WebSocket message schemas in shared/ws/
- [ ] 2.5 Gate: typecheck && lint

## Phase 3: Server migration

- [ ] 3.1 lib/env.ts - parse process.env with Zod
- [ ] 3.2 Schemas/mongoSchema.ts - type MongoDB models
- [ ] 3.3 lib/errors.ts - error handling
- [ ] 3.4 lib/auth.ts - JWT payload parsing, Express request typing
- [ ] 3.5 lib/pythonClient.ts - validated FastAPI responses
- [ ] 3.6 queryManager.ts - convert with typed functions
- [ ] 3.7 lib/route.ts - route wrapper with contract validation
- [ ] 3.8 server.ts - register all routes through route()
- [ ] 3.9 Boot server and smoke test

## Phase 4: Frontend migration (bottom-up)

- [ ] 4.1 src/lib/* (wsManager, formatters, paneManager)
- [ ] 4.2 src/hooks/* (useTicker)
- [ ] 4.3 src/services/* (api, watchlist, dataRequesterForCharts, placeOrder, tradeHistory)
- [ ] 4.4 src/api/* (callEndpoint + per-domain wrappers)
- [ ] 4.5 src/Context/* (context providers)
- [ ] 4.6 src/Components/* (leaf components first)
- [ ] 4.7 src/Components/Charts/* (candlestick, lineChart, ChartPriceMarkers)
- [ ] 4.8 src/pages/* (login, signup, landingPage, market, stockChart, portfolioPage, userProfile)
- [ ] 4.9 src/routes/* (AppRouter, protectedRoutes, checkTokenExpiry)
- [ ] 4.10 src/main.tsx, index.html update
- [ ] 4.11 Gate after each batch: typecheck && lint && format:check
- [ ] 4.12 Before last commit: build

## Phase 5: Cleanup and ratchet

- [ ] 5.1 Confirm no .js/.jsx source files remain (except allowed)
- [ ] 5.2 Remove allowJs from tsconfigs
- [ ] 5.3 Remove old JS block from eslint.config.js
- [ ] 5.4 Self-audit: grep for any, @ts-ignore, as unknown as, eslint-disable, @ts-expect-error, non-null assertions
- [ ] 5.5 Verify npm ls has no missing/invalid peers
- [ ] 5.6 Commit cleanup

## Phase 6: Docs and final verification

- [ ] 6.1 Update .env.example if needed
- [ ] 6.2 Update README with correct ports, env vars, commands, TypeScript/Zod/ESLint/Prettier stack
- [ ] 6.3 Run final verification checklist (section 8)
- [ ] 6.4 Complete MIGRATION.md as final report
- [ ] 6.5 Final commit

---

## Decisions Made

## Route Parity Table

### Express API Routes (server/server.js)

| Method | Path | Auth | Request Body/Query/Params | Response Shape | Status Codes | Error Shape |
|--------|------|------|---------------------------|----------------|--------------|-------------|
| POST | /sign-up | No | body: {email, password, username} | {message: "User Registered"} | 200, 400, 500 | {message}
| POST | /login | No | body: {email, password} | {message: "Login Success", token} | 200, 401, 500 | {message}
| GET | /user-data | Yes (JWT) | - | User (without passwordHash) | 200, 401, 404, 500 | {message}
| POST | /save-subscription | Yes (JWT) | body: {data: PushSubscription} | {success: true} | 200, 400, 404, 500 | {message}
| GET | /quote | Yes (JWT) | query: {ticker} | {ticker, currentPrice, change, percentChange} | 200, 401, 500 | {message}
| GET | /data | Yes (JWT) | query: {ticker, period, interval} | Array of OHLCV candles | 200, 401, 500 | {message}
| GET | /portfolio | Yes (JWT) | - | {count, positions[]} | 200, 401, 500 | {message}
| GET | /user-watchlist | Yes (JWT) | - | Array of watchlist items | 200, 401, 500 | {message}
| GET | /trade-history | Yes (JWT) | - | Array of trades (reversed) | 200, 401, 500 | {message}
| GET | /search | Yes (JWT) | query: {query} | Array of search results | 200, 401, 500 | {message}
| POST | /user-watchlist/add | Yes (JWT) | body: {symbol} | {success: boolean} | 200, 400, 401, 500 | {message}
| DELETE | /user-watchlist/delete | Yes (JWT) | body: {symbol} | {success: boolean} | 200, 400, 401, 500 | {message}
| GET | /data/indicator | Yes (JWT) | query: {ticker, indicator, interval, period, timeperiod?, matype?, stdUp?, stdDown?, fastPeriod?, slowkPeriod?, slowkMatype?, slowdPeriod?, slowdMatype?} | Varies by indicator | 200, 400, 401, 500 | {message}
| POST | /buy | Yes (JWT) | body: {symbol, qty, side: "buy"} | {success, duplicate?, trade?, message} | 200, 400, 422, 500 | {success, message}
| POST | /sell | Yes (JWT) | body: {symbol, qty, side: "sell"} | {success, trade?, message} | 200, 400, 422, 500 | {success, message}
| POST | /stopLoss | Yes (JWT) | body: {symbol, price, startDate, qty, type} | {message: "Stop loss order placed."} | 200, 401, 500 | {message}
| GET | /stopLoss | Yes (JWT) | - | Array of stop losses | 200, 401, 500 | {message}
| DELETE | /stopLoss/:id | Yes (JWT) | params: {id} | {message: "Stop loss cancelled"} | 200, 401, 404, 500 | {message}

### FastAPI HTTP Endpoints (YahooFinanceDataPipeline/Main/server.py)

| Method | Path | Auth | Request Query | Response Shape |
|--------|------|------|---------------|----------------|
| GET | /indicators/EMA | No | ticker, period, interval, timeperiod | Array of {Date, EMA}
| GET | /indicators/SMA | No | ticker, period, interval, timeperiod | Array of {Date, SMA}
| GET | /indicators/RSI | No | ticker, period, interval, timeperiod | Array of {Date, RSI}
| GET | /indicators/VOL | No | ticker, period, interval | Array of {Date, Volume, color}
| GET | /indicators/OBV | No | ticker, period, interval | Array of {Date, OBV}
| GET | /indicators/BBAND | No | ticker, period, interval, timeperiod, matype, stdUp, stdDown | {UP[], MIDDLE[], DOWN[]}
| GET | /indicators/STOCH | No | ticker, period, interval, fastk_period, slowk_period, slowk_matype, slowd_period, slowd_matype | {SLOWK[], SLOWD[]}
| GET | /data | No | ticker, period, interval | Array of OHLCV candles
| GET | /search | No | query | Array of search results
| GET | /quote | No | ticker | {ticker, currentPrice, change, percentChange}

### Vite Proxy Configuration (vite.config.js)

All proxied to http://localhost:3001:
- /sign-up, /login, /portfolio, /buy, /sell, /user-data, /trade-history, /search
- /user-watchlist, /user-watchlist/add, /user-watchlist/delete
- /data/indicator, /save-subscription

## Client Call Table

| File | Endpoint | Method | How Result/Errors Handled |
|------|----------|--------|---------------------------|
| src/services/api.js | /user-data, /portfolio, /trade-history, /user-watchlist, /stopLoss | GET | axios interceptor adds Bearer token; 401 clears token & redirects to /
| src/services/api.js | /user-watchlist/add, /user-watchlist/delete | POST/DELETE | Same interceptor
| src/services/api.js | /stopLoss/:id | DELETE | Same interceptor
| src/services/watchlist.js | /user-watchlist, /user-watchlist/add, /user-watchlist/delete | GET/POST/DELETE | Uses api instance; returns data or {symbols: []} on error
| src/services/dataRequesterForCharts.js | /data, /quote, /data/indicator | GET | Manual axios calls with getAuthHeaders(); returns [] or {currentPrice: 0} on error
| src/services/placeOrder.js | /buy, /sell, /stopLoss | POST | Manual axios with Authorization header; returns {trade, stopLoss} with success/error
| src/services/tradeHistory.js | /trade-history | GET | Uses api instance; returns data or false
| src/hooks/useTicker.js | WS "quote" | WS | Subscribes to wsManager; returns {currentPrice, change, percentChange} or zeros
| src/Context/context.jsx (WatchlistProvider) | /user-watchlist | GET | Polls every 10s; subscribes to WS for each ticker
| src/Context/context.jsx (UserAccountProvider) | /user-data | GET | Polls every 10s
| src/Context/context.jsx (UserEquityProvider) | /portfolio | GET | Polls every 10s; calls fetchQuote for each position
| src/pages/stockChart.jsx | /stopLoss | GET/POST/DELETE | Fetches stop losses; refreshAllData() calls refreshStopLosses()
| src/pages/portfolioPage.jsx | /stopLoss | GET/DELETE | Fetches all stop losses; handles cancel with confirm dialog
| src/pages/userProfile.jsx | /trade-history | GET | Polls every 10s
| src/pages/login.jsx | /login | POST | Direct fetch; stores token in localStorage; redirects on success
| src/pages/signup.jsx | /sign-up | POST | Direct fetch; redirects on success
| src/App.jsx | WS quote & indicator | WS | Connects to ws://127.0.0.1:8001/ws/quote and /ws/indicator on mount

## WebSocket Table

### Express → FastAPI WebSocket (server/StopLoss/stoploss.js)

**Connection:** `ws://localhost:8001/ws/quote` with subprotocol = JWT_TOKEN_05_2036

**Messages Express → FastAPI:**
- Subscribe: `{action: "subscribe", ticker: "AAPL"}`
- Unsubscribe: `{action: "unsubscribe", ticker: "AAPL"}`

**Messages FastAPI → Express:**
- Quote update: `{ticker, currentPrice, change, percentChange, ...}`

**Handling:** Express maintains `tickerToSL` Map<ticker, StopLoss[]>; on quote message, evaluates each stop loss for ticker; if triggered, calls `StopLossExecuter` and sends push notification.

### Frontend → FastAPI WebSocket (src/lib/wsManager.js)

**Connections:**
- `quote`: `ws://127.0.0.1:8001/ws/quote` with subprotocol = localStorage token
- `indicator`: `ws://127.0.0.1:8001/ws/indicator` with subprotocol = localStorage token

**Messages Frontend → FastAPI (quote):**
- Subscribe: `{action: "subscribe", ticker: "AAPL"}`
- Unsubscribe: `{action: "unsubscribe", ticker: "AAPL"}`

**Messages Frontend → FastAPI (indicator):**
- Subscribe: `{action: "subscribe", ticker, interval, indicator, properties}`
- Unsubscribe: `{action: "unsubscribe", ticker, interval, indicator, properties}`

**Messages FastAPI → Frontend (quote):**
- `{ticker, currentPrice, change, percentChange, ...}`

**Messages FastAPI → Frontend (indicator):**
- `{indicator_id, ticker, interval, indicator, properties, timestamp, value/UP/MIDDLE/DOWN/SLOWK/SLOWD, ...}`

**Handling:** wsManager routes messages to subscribers by ticker (quote) or indicator_id (indicator); uses buffered updates via requestAnimationFrame.

## Env Table

### Server (process.env)

| Variable | Source | Used In |
|----------|--------|---------|
| WEB_PUSH_PUBLIC_KEY | .env | server/Services/notificationService.js
| WEB_PUSH_PRIVATE_KEY | .env | server/Services/notificationService.js
| JWT_TOKEN_05_2036 | .env | server/StopLoss/stoploss.js (WebSocket auth to FastAPI)
| EXCHANGE_RATE_API | .env | YahooFinanceDataPipeline/Main/currency.py
| MONGO_URL | .env | server/server.js, server/queryManager.js, server/Schemas/mongoSchema.js
| JWT_SECRET | .env | server/server.js (JWT sign/verify), YahooFinanceDataPipeline/Main/websockets_server.py (WS auth)
| FAST_API_SERVER_DOMAIN | .env | server/server.js (axios base), server/GetData/getQuote.js
| FAST_API_WEB_SOCKET_SERVER_DOMAIN | .env | server/StopLoss/stoploss.js, src/App.jsx
| EXPRESS_SERVER_PORT | .env | server/server.js (default 3001)
| VITE_API_BASE_URL | .env (VITE_) | src/services/api.js, src/services/dataRequesterForCharts.js, src/pages/login.jsx, src/pages/signup.jsx
| VITE_WEB_PUSH_PUBLIC_KEY | .env (VITE_) | src/App.jsx (service worker subscription)

### Client (import.meta.env)

| Variable | Source | Used In |
|----------|--------|---------|
| VITE_API_BASE_URL | .env | src/services/api.js, src/services/dataRequesterForCharts.js, src/pages/login.jsx, src/pages/signup.jsx
| VITE_WEB_PUSH_PUBLIC_KEY | .env | src/App.jsx

## Data Model

### MongoDB Collections (server/Schemas/mongoSchema.js)

**User**
- username: String (required, unique)
- email: String (required, unique)
- passwordHash: String (required)
- balance: Number (default: 1,000,000)
- blockedMargin: Number (default: 0)
- createdAt: Date (default: now)
- lastLogin: Date
- notificationSubscription: NotificationSubscriber (embedded)

**NotificationSubscriber** (embedded in User)
- endpoint: String (required)
- expirationTime: Number (default: null)
- keys: {p256dh: String (required), auth: String (required)}

**Watchlist**
- userId: ObjectId (ref: User, required)
- symbols: [String] (required, default: [])

**Portfolio**
- userId: ObjectId (ref: User, required)
- symbol: String (required)
- shares: Number (required)
- avgPrice: Number (required)
- positionType: String (enum: ['long', 'short'])
- lastUpdated: Date (default: now)

**Trade**
- userId: ObjectId (ref: User, required)
- symbol: String (required)
- shares: Number (required)
- price: Number (required)
- type: String (enum: ['buy', 'sell'], required)
- timestamp: Date (default: now)
- realizedPL: Number (required)
- orderId: String (required, unique)
- wasStopLoss: Boolean (default: false)

**StopLoss**
- userId: ObjectId (ref: User, required)
- symbol: String (required)
- price: Double (required)
- startDate: Date (default: now, required)
- type: String (enum: ['buy', 'sell'], required)
- qty: Number (required)

### FastAPI Response Shapes (inferred from data.py)

**Quote:** `{ticker, currentPrice, change, percentChange}`
**OHLCV Candle:** `{Date, Open, High, Low, Close, Volume}`
**Search Result:** Array of yfinance search quotes
**SMA/EMA/RSI/OBV:** Array of `{Date, <INDICATOR>}`
**VOL:** Array of `{Date, Volume, color}`
**BBAND:** `{UP: [{Date, BBAND_UP}], MIDDLE: [{Date, BBAND_MIDDLE}], DOWN: [{Date, BBAND_DOWN}]}
**STOCH:** `{SLOWK: [{Date, SLOWK}], SLOWD: [{Date, SLOWD}]}

## Dependency Finding

**Root package.json** declares frontend deps only: axios, body-parser, lightweight-charts, react, react-dom, react-router-dom, react-toastify, react-use-websocket, @tailwindcss/vite, tailwindcss, vite, @vitejs/plugin-react, @types/react, @types/react-dom, @eslint/js, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, vite-plugin-node-polyfills.

**Server package.json** (server/package.json) declares server deps: axios, bcrypt, cors, dotenv, express, jsonwebtoken, mongodb, mongoose, uuid, web-push.

**Python requirements** (not in package.json): fastapi, uvicorn, pandas, yfinance, talib, python-jose, pyjwt, websockets.

**Action needed:** Move server dependencies from server/package.json to root package.json (or keep both manifests consistent). The root package.json should include all server deps since `npm install` at root is documented to cover both.

## Baseline Commands

```bash
# From repo root
npm ci          # Install root deps (frontend only currently)
cd server && npm ci  # Install server deps
npm run lint    # Root lint (ESLint flat config)
npm run build   # Vite build
```

## Verification Results

## Suspected Bugs

1. **README port mismatch**: README says Express runs on port 3000, but vite.config.js proxy and .env.example say 3001. Server code uses `process.env.EXPRESS_SERVER_PORT || 3001`.
2. **README env vars incomplete**: README only mentions MONGO_URL and JWT_SECRET, but .env.example lists 10 variables.
3. **Duplicate MongoDB connection**: Both server/server.js and server/queryManager.js call `mongoose.connect()`.
4. **server/queryManager.js imports mongoose but doesn't export connection** - it creates its own connection.
5. **StopLoss schema uses `mongoose.ObjectId`** but should be `mongoose.Schema.Types.ObjectId` for ref.
6. **NotificationService creates new MongoDB connection** via `mongoose.connect()` in queryManager.js import side-effect.
7. **Frontend axios calls in dataRequesterForCharts.js bypass api interceptor** - manual axios with getAuthHeaders() instead of using the shared api instance.
8. **CandleStickChartComponent has massive useEffect with indicator rendering logic** - complex, hard to type, potential memory leaks.
9. **Indicator ID generation differs between frontend and backend** - frontend uses `makeIndicatorId` in paneManager/candlestick, backend uses `generate_indicator_id` in websockets_server.py; must match exactly.
10. **WebSocket token handling**: Frontend uses localStorage token as subprotocol; Express uses JWT_TOKEN_05_2036 env var. Different tokens for different purposes.
11. **No TypeScript types for lightweight-charts v5** - need to verify @types/lightweight-charts or use built-in types.
12. **service worker (public/sw.js) must stay JS** - served as static file, not bundled.
13. **server/node_modules has its own package-lock.json** - may cause version drift.

## Remaining @ts-expect-error / ! / eslint-disable List

(TBD after migration)

## Follow-ups

1. Move server dependencies to root package.json
2. Consolidate MongoDB connection to single place
3. Fix StopLoss schema ObjectId type
4. Unify frontend API calls to use shared api instance
5. Add proper TypeScript types for WebSocket messages
6. Consider extracting indicator rendering logic from CandleStickChartComponent
7. Add tests
8. Set up CI/CD
9. Add husky/lint-staged
10. Consider compiled production server build (tsc output)

## Unverifiable Items

- MongoDB connection (requires running MongoDB instance)
- Python FastAPI service (requires Python environment with yfinance, talib)
- WebSocket end-to-end flow (requires both servers running)
- Push notifications (requires VAPID keys and browser permission)
- Service worker registration (requires HTTPS or localhost)

---

## Phase 0 Complete

Inventory complete. Ready to proceed to Phase 1: Formatting, TypeScript, and lint tooling.

**Commit:** `docs: add migration inventory and baseline`
# Frontend

One-sentence purpose: Documents frontend routing, components, state management, API client setup, and theme tokens.

## Routing Map

Defined in `src/routes/AppRouter.tsx`.

| Page | Route | Auth Required | Component |
|------|-------|---------------|-----------|
| Login | `/` | No | `src/pages/login.tsx` |
| Signup | `/signup` | No | `src/pages/signup.tsx` |
| Landing Page (dashboard) | `/landing-page` | Yes | `src/pages/landingPage.tsx` |
| Stock Chart | `/chart/:ticker` | Yes | `src/pages/stockChart.tsx` |
| Portfolio | `/userPortfolio` | Yes | `src/pages/portfolioPage.tsx` |
| User Profile | `/userprofile` | Yes | `src/pages/userProfile.tsx` |
| Market | (embedded in LandingPage) | Yes | `src/pages/market.tsx` |

Auth guard: `src/routes/protectedRoutes.tsx` calls `GET /user-data` on mount (cookie credentials) and renders a loading state while checking; authenticated → `<Outlet/>`, otherwise `<Navigate to="/" />`. No token is read from `localStorage`.

## Folder Conventions

| Folder | Purpose |
|--------|---------|
| `src/pages/` | Top-level route page components |
| `src/Components/` | Reusable UI components |
| `src/Context/` | React context providers and context definitions |
| `src/lib/` | WebSocket manager, formatters, custom hooks |
| `src/services/` | API client wrappers and business logic calls |
| `src/routes/` | Router configuration and route guards |
| `src/assets/` | Static assets (icons, images, sounds) |
| `src/pages/styles/` | Page-specific CSS files |

## Shared Components

| Component | Path | Purpose |
|-----------|------|---------|
| `Navbar` | `src/Components/Navbar.tsx` | Top navigation with Home, Portfolio, Profile links |
| `OrderForm` | `src/Components/OrderForm.tsx` | Buy/sell order form with optional stop-loss |
| `PasswordInput` | `src/Components/PasswordInput.tsx` | Password input with show/hide toggle |
| `Watchlist` | `src/Components/Watchlist.tsx` | Watchlist panel with add/remove symbols |
| `Avatar` | `src/Components/Avatar.tsx` | User avatar with initials fallback |
| `Ticker` | `src/Components/ticker.tsx` | Individual watchlist ticker row |
| `ChartErrorBoundary` | `src/Components/ChartErrorBoundary.tsx` | Error boundary for chart components |
| `ErrorBoundary` | `src/Components/ErrorBoundary.tsx` | General error boundary |
| `IndicatorPopUps/` | `src/Components/IndicatorPopUps/` | Indicator configuration modals |
| `Charts/` | `src/Components/Charts/` | Candlestick chart components |
| `Toast/` | `src/Components/Toast/` | Toast notification provider and utilities |
| `floatingSearchTab.tsx` | `src/Components/floatingSearchTab.tsx` | Symbol search popup |
| `searchResultComponent.tsx` | `src/Components/searchResultComponent.tsx` | Search result item |

**Rule:** Use shared `Button`, `Input`, `PasswordInput` over custom implementations. No inline styles when theme tokens exist.

## State/Auth Management

| Context | Path | Purpose |
|---------|------|---------|
| `UserAccountContext` | `src/Context/context.ts` | User account info (balance, email, username, etc.), refreshed every 10s |
| `UserEquityContext` | `src/Context/context.ts` | Portfolio positions, P&L, total equity, refreshed every 10s |
| `WatchlistContext` | `src/Context/context.ts` | Watchlist symbols and price map, subscribed via WebSocket |
| `MarketDataContext` | `src/Context/MarketPageContextProvider.tsx` | Market-wide quote map for all symbols, subscribed via WebSocket |
| `IndicatorsListContext` | `src/Context/context.ts` | Indicator configuration list |

Auth state is cookie-based: the HttpOnly `access_token` / `refresh_token` cookies are sent automatically. `src/services/auth.ts` implements `loginWithPkce()` (two-step PKCE login) and `fetchWsTicket()`. The `ProtectedRoutes` component and the `api.ts` interceptor handle session validity and refresh.

## API Client Setup

- **Same-origin in development:** `VITE_API_BASE_URL` is empty, so all calls use relative URLs and the **Vite dev proxy** (`vite.config.ts`) forwards them to `http://localhost:3001`. This keeps auth cookies first-party — cross-origin cookie setting/sending is blocked by modern browsers.
- `src/services/api.ts`: Axios instance with `withCredentials: true` (cookies are sent automatically; no Authorization header).
- Response interceptor: on 401 (except `/auth/refresh` and `/auth/logout`), calls `POST /auth/refresh` once (shared promise), retries the original request; if refresh fails, redirects to `/` (unless on `/` or `/signup`).
- `src/services/auth.ts`: `loginWithPkce(email, password)` — creates a PKCE pair (`src/lib/pkce.ts`, WebCrypto), POSTs `/auth/login` then `/auth/token` with `credentials: 'include'`; `fetchWsTicket()` POSTs `/auth/ws-ticket`.
- `src/services/dataRequesterForCharts.ts`: Axios calls for chart data (`/data`, `/quote`, `/data/indicator`) with `withCredentials: true`.
- `src/services/placeOrder.ts`: Combined trade + stop-loss placement with sound feedback.
- `src/services/watchlist.ts`: Watchlist CRUD operations.
- `src/services/tradeHistory.ts`: Trade history fetch.

Vite proxy (`vite.config.ts`) forwards specific API paths to `http://localhost:3001` during development.

## WebSocket

- `src/lib/wsManager.ts`: `WebSocketManager` class with auto-reconnect (exponential backoff up to 60s on consecutive failed connects, reset on success), subscription management, and indicator subscription tracking. `connect(name, url, { getToken })` fetches a fresh ticket before every (re)connect and sends it as a subprotocol.
- Two persistent connections: `quote` (`ws://127.0.0.1:8001/ws/quote`) and `indicator` (`ws://127.0.0.1:8001/ws/indicator`).
- Auth: `src/App.tsx` passes `getToken: fetchWsTicket` (from `POST /auth/ws-ticket`, cookie-authenticated) to `wsManager.connect(...)`; the ticket JWT is sent as the WebSocket subprotocol (the session cookie is HttpOnly and cannot be read by JS). While no ticket can be fetched (e.g. logged out), no connection is attempted and the retry is backed off to 30s — no 403 retry spam against the WS server.
- `useTicker` hook (`src/hooks/useTicker.ts`) subscribes to quote updates for a specific ticker.

## Theme Tokens

The app uses a pitch-black theme. Theme CSS variables are defined in `src/index.css`.

| Token | Purpose |
|-------|---------|
| `--bg` | Background color |
| `--surface` | Surface/card color |
| `--border` | Border color |
| `--text` | Primary text color |
| `--text-primary` | Primary text (emphasized) |
| `--text-secondary` | Secondary text |
| `--text-dim` | Dimmed text |
| `--text-muted` | Muted text |
| `--color-text` | General text |
| `--color-text-muted` | Muted text |
| `--color-up-glow` | Positive change glow |
| `--transition-fast` | Fast transition duration |

**Rule:** No hardcoded colors outside theme tokens.

## Key Behaviors

- Push subscription: On app load, if Notification permission is granted, a push subscription is created via the Push API and sent to `POST /save-subscription`. Subscription changes are synced via `localStorage` (`last_synced_subscription`).
- Portfolio/P&L and user account data are refetched every 10 seconds via `setInterval`.
- Watchlist data is refetched every 10 seconds.
- Trade history is refetched every 10 seconds on the profile page.

---

**Open Questions / Known Gaps**

- No hardcoded color rule is enforced by lint; it's a convention only.
- Some components use inline styles (e.g., `PasswordInput.tsx` eye button) despite the theme token rule.
- The `Update Profile` button in `userProfile.tsx` is disabled (`disabled={true}`) with no handler implemented.

---

**Last verified against code:** `src/AppRouter.tsx`, `src/routes/protectedRoutes.tsx`, `src/services/api.ts`, `src/lib/wsManager.ts`, `src/Context/context.ts`, `src/Context/contextProviders.tsx`, `src/index.css`, `vite.config.ts`.
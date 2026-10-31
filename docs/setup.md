# Setup

One-sentence purpose: Instructions for installing and running the Paper Trading App locally.

## Prerequisites

- **Node.js** >= 20.19.0 (see `engines` in `package.json`)
- **Python** 3.10+ (for the FastAPI market data service)
- **MongoDB** running instance (local or MongoDB Atlas)
- **npm** (comes with Node.js)

## Install Steps

1. Clone the repository.
2. From the repo root, install Node dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file at the repo root based on `.env.example`. See [environment.md](./environment.md) for the full variable list.

   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Set up the Python market data service:

   ```bash
   cd YahooFinanceDataPipeline/Main
   python -m venv .venv
   # On macOS/Linux:
   source .venv/bin/activate
   # On Windows:
   .venv\Scripts\activate.bat

   pip install -r requirements.txt
   # Fallback if requirements.txt is missing:
   # pip install fastapi uvicorn pandas yfinance talib

   uvicorn server:app --reload --host 127.0.0.1 --port 8000
   ```

   The Express server expects this service at `http://127.0.0.1:8000`.

5. Start the Express API server (new terminal):

   ```bash
   npm run dev:server
   ```

   Runs on port `3001` (from `EXPRESS_SERVER_PORT`).

6. Start the frontend dev server (new terminal):

   ```bash
   npm run dev
   ```

   Vite hosts the frontend at `http://localhost:5173`.

## Ports

| Service | Port | Notes |
|---------|------|-------|
| Frontend (Vite) | 5173 | UI client dashboard |
| Express API | 3001 | REST API (`EXPRESS_SERVER_PORT`) |
| FastAPI HTTP | 8000 | Market data (`FAST_API_SERVER_DOMAIN`) |
| FastAPI WebSocket | 8001 | Real-time quotes (`FAST_API_WEB_SOCKET_SERVER_DOMAIN`) |
| MongoDB | 27017 | Default local MongoDB port |

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Required variables:

- `MONGO_URL` — MongoDB connection string
- `JWT_SECRET` — Secret for signing JWTs (min 32 chars)
- `FAST_API_SERVER_DOMAIN` — e.g. `http://localhost:8000`
- `FAST_API_WEB_SOCKET_SERVER_DOMAIN` — e.g. `ws://localhost:8001`
- `JWT_TOKEN_05_2036` — Token for Express WebSocket client to FastAPI
- `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` — VAPID keys for push notifications
- `VITE_API_BASE_URL` — e.g. `http://localhost:3001` (frontend)
- `VITE_WEB_PUSH_PUBLIC_KEY` — Web Push public key (frontend)
- `EXCHANGE_RATE_API` — Exchange rate API key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` / `FRONTEND_URL` — Google OAuth (optional; OAuth won't work without them)

See [environment.md](./environment.md) for the complete table.

## Seeding Data

There is no seed script. A new user signing up gets a default starting balance of 1,000,000 (see `server/Schemas/mongoSchema.ts`, `UserSchema.balance` default).

## Common Problems and Fixes

| Problem | Fix |
|---------|-----|
| MongoDB connection fails | Ensure `mongod` is running or your MongoDB Atlas cluster is accessible; verify `MONGO_URL` in `.env`. |
| Missing market data | Ensure the FastAPI server is running on port 8000/8001. Check `yfinance` rate limits. |
| 401 errors on API calls | Ensure the JWT token is in `localStorage` under key `token` and not expired. |
| CORS/proxy issues | Verify `vite.config.ts` proxy targets point to `http://localhost:3001`. |
| Google OAuth not working | Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, and `FRONTEND_URL` are set in `.env`. |
| Build fails | Run `npm run typecheck` to see TypeScript errors. |

## Production Build

```bash
npm run build
```

This runs typecheck, then Vite build. Static assets go to `/dist`.

---

**Last verified against code:** `package.json`, `vite.config.ts`, `.env.example`, `server/server.ts`, `server/Schemas/mongoSchema.ts`.
# Environment Variables

One-sentence purpose: Documents every environment variable used in the codebase, its service, requirement status, purpose, example value, and source.

## Variable Table

| Name | Service | Required | Purpose | Example Placeholder | Where to Get It |
|------|---------|----------|---------|---------------------|-----------------|
| `NODE_ENV` | Backend | No | Environment mode (development/production/test) | `development` | — |
| `PORT` / `EXPRESS_SERVER_PORT` | Backend | No | Port for the Express server | `3001` | — |
| `MONGO_URL` | Backend | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/?appName=PaperTradingApp` | MongoDB Atlas |
| `JWT_SECRET` | Backend | Yes | Secret for signing/verifying JWTs (min 32 chars) | `9534c7408763...` | Generate locally |
| `JWT_TOKEN_05_2036` | Backend | Yes | Token for Express WebSocket client to connect to FastAPI | `eyJ...` | Generated JWT |
| `FAST_API_SERVER_DOMAIN` | Backend | Yes | FastAPI HTTP base URL | `http://localhost:8000` | FastAPI service config |
| `FAST_API_WEB_SOCKET_SERVER_DOMAIN` | Backend | Yes | FastAPI WebSocket base URL | `ws://localhost:8001` | FastAPI service config |
| `EXCHANGE_RATE_API` | Backend | No | Exchange rate API key | `9a9a97c4ebca13767d6978fb` | exchangerate-api.com |
| `WEB_PUSH_PUBLIC_KEY` | Backend | Yes | VAPID public key for web push | `BEiCn6A6...` | Web Push VAPID generator |
| `WEB_PUSH_PRIVATE_KEY` | Backend | Yes | VAPID private key for web push | `KKnCk0uf...` | Web Push VAPID generator |
| `VITE_API_BASE_URL` | Frontend | Yes | Base URL for frontend API calls | `http://localhost:3001` | Express server address |
| `VITE_WEB_PUSH_PUBLIC_KEY` | Frontend | Yes | Web Push public key (same as backend) | `BEiCn6A6...` | Web Push VAPID generator |
| `GOOGLE_CLIENT_ID` | Backend | No (OAuth won't work without) | Google OAuth client ID | `...apps.googleusercontent.com` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Backend | No (OAuth won't work without) | Google OAuth client secret | `GOCSPX-...` | Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Backend | No | Google OAuth redirect URI | `http://localhost:3001/api/auth/google/callback` | Google Cloud Console |
| `FRONTEND_URL` | Backend | No | Frontend origin for OAuth redirect | `http://localhost:5173` | — |

## Rules

- **Secrets are never committed.** The `.env` file is in `.gitignore`.
- `.env.example` must list every variable with a placeholder value.
- Never log tokens, codes, or secrets to the console.
- JWTs are stored in `localStorage` under the key `token` on the frontend.
- Google OAuth state is stored in short-lived httpOnly cookies (`google_oauth_state`, `google_oauth_origin`, 10-minute maxAge).

---

**Last verified against code:** `.env`, `.env.example`, `server/lib/env.ts`, `server/lib/googleAuth.ts`, `src/App.tsx`, `src/services/api.ts`, `package.json`.
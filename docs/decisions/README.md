# Decision Records

One-sentence purpose: How to write a decision record, plus a list of major past decisions visible in the code.

## How to Write a Decision Record

Create a new file in this folder named `YYYY-MM-DD-topic.md`. Each record should contain:

1. **Title** — short description of the decision
2. **Status** — proposed, accepted, superseded, or deprecated
3. **Context** — what problem was being solved
4. **Decision** — what was chosen
5. **Rationale** — why this was chosen over alternatives
6. **Consequences** — positive and negative impacts
7. **Files affected** — relevant file paths

## Past Decisions

| Decision | Date | Files |
|----------|------|-------|
| Pitch-black theme with CSS variables | Early development | `src/index.css` |
| Google OAuth with server-side authorization code flow + PKCE (S256) | Early development, hardened with PKCE | `server/lib/googleAuth.ts`, `server/lib/authStore.ts`, `src/pages/login.tsx` |
| HttpOnly cookie sessions (15m access JWT + 7d refresh token with family rotation/reuse detection) | PKCE migration | `server/lib/session.ts`, `server/lib/cookies.ts`, `server/lib/authStore.ts` |
| Two-step PKCE (RFC 7636, S256-only) email/password login | PKCE migration | `server/server.ts`, `server/lib/pkce.ts`, `src/lib/pkce.ts`, `src/services/auth.ts` |
| MongoDB for persistence | Early development | `server/Schemas/mongoSchema.ts` |
| Zod for shared request/response contracts | Early development | `shared/contract/` |
| Python FastAPI for market data (Yahoo Finance) | Early development | `YahooFinanceDataPipeline/`, `server/lib/pythonClient.ts` |
| WebSocket for real-time quotes, authenticated via short-lived ticket JWT (`POST /auth/ws-ticket`) as subprotocol | PKCE migration | `src/lib/wsManager.ts`, `src/App.tsx`, `server/lib/session.ts` |
| localStorage for JWT token storage | Early development — **removed** in the PKCE migration; tokens live only in HttpOnly cookies | (was `src/services/api.ts`, `src/pages/login.tsx`) |
| bcrypt salt rounds = 10 | Early development | `server/queryManager.ts` (`SignUp`) |
| Default starting balance = 1,000,000 | Early development | `server/Schemas/mongoSchema.ts` (`UserSchema.balance`) |
| 1.5x margin requirement for short positions | Early development | `server/queryManager.ts` (`executeTrade`) |

---

**Last verified against code:** All files listed in the table above.
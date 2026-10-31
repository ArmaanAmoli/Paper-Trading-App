# Testing

One-sentence purpose: What to test, where tests live, how to run them, and the manual test checklist.

## Current State

**There are no automated tests in this project.** The `server/package.json` test script is `echo "Error: no test specified" && exit 1`, and there is no test configuration in the root `package.json`.

## What to Test (when tests are added)

- **Backend:** Auth (signup, login, Google OAuth), trade execution (buy/sell, margin, balance), portfolio calculations, stop-loss placement and execution, user deletion cascade.
- **Frontend:** Login flow, protected route guard, order form submission, watchlist add/remove, portfolio display, WebSocket reconnection.

## Where Tests Would Live

No convention exists yet. Suggested: `server/tests/` for backend, `src/__tests__/` or `src/*.test.tsx` for frontend.

## How to Run

No test runner is configured. If adding one, consider Vitest (matches Vite) or Jest.

## Manual Test Checklist

Before every commit, manually verify these critical flows:

1. **Signup:** Create a new account with email/password; verify user is created and redirected to login.
2. **Login:** Log in with valid credentials; verify JWT is stored and user is redirected to landing page.
3. **Google login:** Click "Continue with Google"; verify redirect to Google consent and back with token.
4. **Persistent session after browser restart:** Close and reopen the browser; verify token persists in `localStorage` and user remains logged in.
5. **Logout:** Click logout; verify token is removed and user is redirected to login.
6. **Delete account:** Type "DELETE", confirm; verify account and all data are removed, user is redirected to login.
7. **Placing a trade:** Buy/sell a stock; verify portfolio updates, balance changes, and trade appears in history.
8. **Stop-loss:** Place a stop-loss; verify it appears in the portfolio page and can be cancelled.
9. **Watchlist:** Add/remove a symbol; verify it appears/disappears from the watchlist panel.
10. **Market data:** Verify quotes and chart data load from the FastAPI service.

## Before Every Commit

- Run `npm run typecheck`
- Run `npm run lint`
- Run `npm run format:check`
- Run `npm run build`
- Manually verify at least the login → trade → portfolio flow

---

**Last verified against code:** `package.json` scripts, `server/package.json` test script, absence of test files.
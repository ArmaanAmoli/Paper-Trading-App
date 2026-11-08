/**
 * Fired on `window` whenever a session starts — after a successful login or
 * a session restore. App listens for it to start authenticated-only work
 * (market-data WebSocket feeds, push subscription sync) so a logged-out tab
 * never polls auth endpoints.
 */
export const AUTH_SESSION_STARTED_EVENT = 'auth:session-started';

export function notifySessionStarted(): void {
  window.dispatchEvent(new Event(AUTH_SESSION_STARTED_EVENT));
}

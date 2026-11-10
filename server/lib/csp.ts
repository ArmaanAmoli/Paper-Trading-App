import type { Request, Response, NextFunction } from 'express';

/**
 * Content-Security-Policy header for every response.
 *
 * The auth session is cookie-based, so the strongest defense against an
 * injected script firing requests as the user (XSS) is to prevent script
 * execution in the first place: script-src 'self' blocks inline and
 * cross-origin scripts. object-src 'none' + base-uri 'self' stop plugin
 * and base-tag injection; frame-ancestors 'none' stops clickjacking.
 *
 * connect-src allows ws:/wss: so the market-data WebSocket (which may live
 * on another port/host in dev) keeps working; img-src allows data: URIs
 * used by chart rendering.
 */
export const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function cspMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  next();
}

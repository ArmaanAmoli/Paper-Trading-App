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
 * used by chart rendering. Google Fonts (Geist) is loaded from
 * fonts.googleapis.com / fonts.gstatic.com, so those origins are
 * allowlisted in style-src / font-src.
 */
export const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  // Google Fonts stylesheet (index.html loads Geist via fonts.googleapis.com)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data:",
  // Google Fonts files are served from fonts.gstatic.com
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function cspMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  next();
}

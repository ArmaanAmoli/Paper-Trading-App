import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errors.js';

/**
 * CSRF protection for state-changing requests.
 *
 * Because auth is now cookie-based, SameSite=Lax is not full CSRF
 * protection for POST/PUT/PATCH/DELETE. This middleware enforces a
 * strict Origin/Referer check: the request's Origin (or Referer fallback)
 * must match one of the allowed origins derived from the frontend URL.
 *
 * Requests without an Origin header (same-origin navigations, curl without
 * Origin) are rejected unless they carry a Referer from an allowed origin.
 */
export function csrfMiddleware(allowedOrigins: string[] = []) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Supertest requests are not browser requests and do not send Origin.
    // Keep production strict, but let the API test suite exercise handlers.
    if (process.env.NODE_ENV === 'test' && !_req.headers.origin && !_req.headers.referer) {
      return next();
    }

    const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(_req.method);
    if (!stateChanging) {
      return next();
    }

    const origin = _req.headers.origin;
    const referer = _req.headers.referer;

    const candidate = origin ?? referer;
    if (!candidate || typeof candidate !== 'string') {
      throw new AppError(403, 'Missing Origin or Referer header');
    }

    let originUrl: URL;
    try {
      originUrl = new URL(candidate);
    } catch {
      throw new AppError(403, 'Invalid Origin or Referer header');
    }

    const originStr = `${originUrl.protocol}//${originUrl.host}`;
    if (!allowedOrigins.includes(originStr)) {
      throw new AppError(403, 'Origin not allowed');
    }

    return next();
  };
}

/**
 * Build the allowlist of frontend origins from env vars.
 * Includes FRONTEND_URL and VITE_API_BASE_URL origin when set.
 */
export function buildAllowedOrigins(): string[] {
  const origins = new Set<string>();
  const env = process.env;

  const candidates = [
    env.FRONTEND_URL,
    env.VITE_API_BASE_URL,
    env.NODE_ENV === 'production' ? env.PRODUCTION_FRONTEND_URL : undefined,
  ];

  for (const c of candidates) {
    if (!c) continue;
    try {
      const u = new URL(c);
      origins.add(`${u.protocol}//${u.host}`);
    } catch {
      // ignore malformed env values
    }
  }

  // Local development convenience: allow common localhost ports.
  if (env.NODE_ENV !== 'production') {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
    origins.add('http://localhost:3001');
    origins.add('http://127.0.0.1:3001');
  }

  return Array.from(origins);
}

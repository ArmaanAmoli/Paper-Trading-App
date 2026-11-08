import type { Request } from 'express';
import { getEnv } from './env.js';

/**
 * Standard cookie options for every auth cookie.
 *
 * - HttpOnly: true — never readable by frontend JS
 * - SameSite: 'lax' — required for top-level cross-site OAuth callbacks
 * - Secure: true in production; false only on localhost
 * - explicit path and maxAge on every cookie
 */
export interface AuthCookieOptions {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
}

function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Cookie options for short-lived access tokens (e.g. 15 minutes).
 */
export function accessTokenCookieOptions(path: string = '/'): AuthCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path,
    maxAge: 15 * 60 * 1000, // 15 minutes
  };
}

/**
 * Cookie options for longer-lived refresh tokens (e.g. 7 days),
 * scoped to the refresh endpoint path.
 */
export function refreshTokenCookieOptions(path: string = '/auth/refresh'): AuthCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

/**
 * Cookie options for short-lived PKCE / OAuth state transactions
 * (5–10 minutes). SameSite=lax is required here because the callback
 * is a top-level cross-site navigation from Google.
 */
export function pkceCookieOptions(path: string = '/'): AuthCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path,
    maxAge: 10 * 60 * 1000, // 10 minutes
  };
}

/**
 * Options used when clearing a cookie. They must match the attributes of the
 * original cookie (path, secure, sameSite) or the browser will not remove it.
 */
export interface ClearCookieOptions {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
}

/**
 * Clear-cookie options that match the set options so the browser removes
 * the cookie. Secure/sameSite must match the original attributes.
 */
export function clearCookieOptions(path: string = '/'): ClearCookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path,
  };
}

/**
 * Read a single cookie from the request in a type-safe way.
 * `req.cookies` is typed as `any` by cookie-parser, so all access goes
 * through this helper. Returns the value only when it is a string.
 */
export function getCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' ? value : undefined;
}

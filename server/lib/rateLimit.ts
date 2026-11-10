import type { Request, RequestHandler } from 'express';
import { AppError } from './errors.js';

/**
 * Dependency-free in-memory fixed-window rate limiter.
 *
 * Keyed by client IP and route path. Not suitable for multi-instance
 * deployments without a shared store, but sufficient for a single-node
 * Express server and better than no rate limiting on auth endpoints.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

function now(): number {
  return Date.now();
}

function getWindow(key: string, windowMs: number): Window {
  const existing = windows.get(key);
  if (existing && existing.resetAt > now()) {
    return existing;
  }
  const window: Window = { count: 0, resetAt: now() + windowMs };
  windows.set(key, window);
  return window;
}

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (String(forwarded).split(',')[0]?.trim() ?? 'unknown')
    : (req.ip ?? 'unknown');
  return `${ip}:${req.path}`;
}

/**
 * Create a rate-limit middleware.
 *
 * @param windowMs - window length in milliseconds
 * @param max - max requests per window per key
 * @param message - error message returned on 429
 */
export function rateLimit({
  windowMs = 60 * 1000,
  max = 20,
  message = 'Too many requests, please try again later',
}: {
  windowMs?: number;
  max?: number;
  message?: string;
} = {}): RequestHandler {
  return (req, _res, next) => {
    const key = clientKey(req);
    const window = getWindow(key, windowMs);
    window.count += 1;

    if (window.count > max) {
      throw new AppError(429, message);
    }

    next();
  };
}

/**
 * Exported for testing / inspection only.
 */
export function clearRateLimitWindows(): void {
  windows.clear();
}

/**
 * Exported for testing / inspection only.
 */
export function getRateLimitWindowCount(key: string): number {
  return windows.get(key)?.count ?? 0;
}

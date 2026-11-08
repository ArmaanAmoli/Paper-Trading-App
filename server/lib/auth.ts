import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getEnv } from './env.js';
import { UnauthorizedError } from './errors.js';
import { getCookie } from './cookies.js';
import { ACCESS_TOKEN_COOKIE } from './session.js';

// JWT payload schema (matches the one used in server.js)
export const jwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

// Extend Express Request type to include user property
declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}

/**
 * Read the access token from the HttpOnly cookie. Tokens are never read
 * from Authorization headers or URL parameters.
 */
function readAccessToken(req: Request): string {
  const token = getCookie(req, ACCESS_TOKEN_COOKIE);
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }
  return token;
}

export function verifyToken(req: Request): JwtPayload {
  const env = getEnv();
  const token = readAccessToken(req);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    // WebSocket tickets carry a `scope` claim and must not be usable as
    // API access tokens.
    if (typeof decoded !== 'object' || decoded === null || 'scope' in decoded) {
      throw new UnauthorizedError('Invalid token');
    }
    const payload = jwtPayloadSchema.parse(decoded);
    return payload;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = verifyToken(req);
    next();
  } catch (err) {
    if (err instanceof Error) {
      // Let the global error handler deal with it
      throw err;
    }
    next(err);
  }
}

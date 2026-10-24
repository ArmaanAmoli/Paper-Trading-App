import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getEnv } from './env.js';
import { UnauthorizedError } from './errors.js';

// JWT payload schema (matches the one used in server.js)
export const jwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function verifyToken(req: Request): JwtPayload {
  const env = getEnv();
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    throw new UnauthorizedError('No token provided');
  }
  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid token format');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('Invalid token format');
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const payload = jwtPayloadSchema.parse(decoded);
    return payload;
  } catch (err) {
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

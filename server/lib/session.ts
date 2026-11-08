import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';
import { getEnv } from './env.js';
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  clearCookieOptions,
} from './cookies.js';
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken } from './authStore.js';
import { UnauthorizedError } from './errors.js';

/**
 * Cookie names used by the session layer.
 */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const REFRESH_TOKEN_PATH = '/auth';

/**
 * Access token lifetime: 15 minutes.
 */
export const ACCESS_TOKEN_TTL = '15m';

/**
 * WebSocket ticket lifetime: 5 minutes. Short-lived on purpose — it exists
 * only so the frontend can authenticate the market-data WebSocket handshake
 * (the ticket travels as a subprotocol because HttpOnly cookies cannot be
 * read by JS). It is rejected as an API access token via its `scope` claim.
 */
export const WS_TICKET_TTL = '5m';

/**
 * Issue a short-lived JWT for the market-data WebSocket. The Python WS
 * server verifies it with the same JWT_SECRET.
 */
export function issueWsTicket(user: { userId: string; email: string }): string {
  const env = getEnv();
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      scope: 'ws',
    },
    env.JWT_SECRET,
    { expiresIn: WS_TICKET_TTL },
  );
}

/**
 * Issue a fresh session: an access token (JWT) and a refresh token,
 * both delivered exclusively as HttpOnly cookies.
 *
 * The plaintext tokens are never returned to the caller — they only ever
 * exist in the Set-Cookie headers.
 */
export async function issueSession(
  res: Response,
  user: { id: string; email: string },
): Promise<void> {
  const env = getEnv();

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const refreshToken = await createRefreshToken({
    userId: user.id,
    familyId: uuidv4(),
  });

  setSessionCookies(res, accessToken, refreshToken);
}

/**
 * Rotate an existing session: validate the presented refresh token, revoke
 * it, and issue a new access token + refresh token pair.
 */
export async function rotateSession(
  res: Response,
  presentedRefreshToken: string,
): Promise<{ userId: string }> {
  const env = getEnv();

  const { token: newRefreshToken, userId } = await rotateRefreshToken({
    token: presentedRefreshToken,
  });

  const { User } = await import('../Schemas/mongoSchema.js');
  const user = await User.findById(userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const accessToken = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  setSessionCookies(res, accessToken, newRefreshToken);

  return { userId };
}

/**
 * Revoke the presented refresh token (and its family) and clear the cookies.
 */
export async function clearSession(res: Response, presentedRefreshToken?: string): Promise<void> {
  if (presentedRefreshToken) {
    await revokeRefreshToken(presentedRefreshToken);
  }

  res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions('/'));
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions(REFRESH_TOKEN_PATH));
}

/**
 * Apply the session cookies to the response.
 */
function setSessionCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions('/'));
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions(REFRESH_TOKEN_PATH));
}

import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import { getEnv } from './env.js';
import { AppError } from './errors.js';
import type { Request, Response, NextFunction } from 'express';
import { deriveCodeChallenge, generateCodeVerifier } from './pkce.js';
import { createOAuthTransaction, consumeOAuthTransaction } from './authStore.js';
import { pkceCookieOptions, clearCookieOptions, getCookie } from './cookies.js';
import { buildAllowedOrigins } from './csrf.js';
import { issueSession } from './session.js';

// Lazy initialization of OAuth2Client - only created when needed
let oauth2Client: OAuth2Client | null = null;

/**
 * Cookie holding the opaque id of the server-side OAuth transaction.
 * It contains no secrets: the code verifier and state live server-side.
 */
const OAUTH_TRANSACTION_COOKIE = 'google_oauth_tx';

/**
 * Google issuer values accepted for ID tokens.
 */
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

function getOAuth2Client(): OAuth2Client {
  if (!oauth2Client) {
    const env = getEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
      throw new AppError(503, 'Google OAuth is not configured');
    }
    oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL,
    );
  }
  return oauth2Client;
}

/**
 * Generate a random, single-use state string for CSRF protection.
 */
function generateState(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Determine the origin the user is browsing from, for the post-callback
 * redirect and for deriving the OAuth redirect_uri.
 *
 * Cookies are host-scoped and browsers treat `localhost` and `127.0.0.1` as
 * different hosts, so the whole OAuth round trip (the `google_oauth_tx`
 * cookie, the callback, and the session cookies) must stay on the exact host
 * the user is browsing. Only allowlisted origins (the same list the CSRF
 * middleware enforces) are accepted from the Referer header; anything else
 * falls back to the configured frontend URL.
 */
function resolveOrigin(req: Request): string {
  const env = getEnv();
  const fallback = env.FRONTEND_URL ?? 'http://localhost:5173';
  const referer = req.headers.referer;
  if (referer) {
    try {
      const origin = new URL(referer).origin;
      if (buildAllowedOrigins().includes(origin)) {
        return origin;
      }
    } catch {
      // fall through to the configured frontend URL
    }
  }
  return fallback;
}

/**
 * Derive the redirect_uri for this transaction from the origin the user
 * started from. `GOOGLE_CALLBACK_URL` provides the path (and the fallback
 * host); its host is swapped for the request origin so Google returns the
 * browser to the same host the app is being used on. Both variants (e.g.
 * `http://localhost:5173/api/auth/google/callback` and
 * `http://127.0.0.1:5173/api/auth/google/callback`) must be registered in
 * Google Cloud Console.
 */
function resolveCallbackUrl(origin: string): string {
  const configured = getEnv().GOOGLE_CALLBACK_URL;
  if (!configured) return origin; // getOAuth2Client() reports the missing config
  try {
    const url = new URL(configured);
    const originUrl = new URL(origin);
    url.protocol = originUrl.protocol;
    url.host = originUrl.host;
    return url.toString();
  } catch {
    return configured;
  }
}

/**
 * GET /api/auth/google
 * Redirects to Google's consent screen using PKCE (S256) and a state nonce.
 */
export async function googleAuthStart(req: Request, res: Response, next: NextFunction) {
  try {
    const client = getOAuth2Client();

    // Server-generated PKCE material. The verifier never leaves the server
    // except in the token exchange request to Google.
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(codeVerifier);
    const state = generateState();
    const origin = resolveOrigin(req);
    // Send Google back to the same host the user is browsing, so the
    // host-scoped transaction cookie is present at the callback and the
    // session cookies are set on the host the user will return to.
    const callbackUrl = resolveCallbackUrl(origin);

    // The verifier, state and callback URL are stored server-side; the cookie
    // only holds the opaque transaction id.
    const transactionId = await createOAuthTransaction({
      codeVerifier,
      state,
      origin,
      callbackUrl,
    });

    res.cookie(OAUTH_TRANSACTION_COOKIE, transactionId, pkceCookieOptions('/'));

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'consent',
      redirect_uri: callbackUrl,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/google/callback
 * Handles the callback from Google after user consent.
 */
export async function googleAuthCallback(req: Request, res: Response, next: NextFunction) {
  // The temporary PKCE cookie is cleared immediately, on success and failure.
  const transactionId = getCookie(req, OAUTH_TRANSACTION_COOKIE);
  res.clearCookie(OAUTH_TRANSACTION_COOKIE, clearCookieOptions('/'));

  let origin = getEnv().FRONTEND_URL ?? 'http://localhost:5173';

  try {
    const client = getOAuth2Client();
    const env = getEnv();

    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const returnedState = typeof req.query.state === 'string' ? req.query.state : undefined;

    if (!transactionId) {
      return redirectWithError(res, origin, 'google_failed');
    }

    if (!code || !returnedState) {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Validate state against the stored transaction and consume it (single-use).
    let codeVerifier: string;
    let callbackUrl: string;
    try {
      const transaction = await consumeOAuthTransaction({
        transactionId,
        expectedState: returnedState,
      });
      codeVerifier = transaction.codeVerifier;
      origin = transaction.origin;
      // Google requires the token-exchange redirect_uri to exactly match the
      // one used in the authorization request.
      callbackUrl = transaction.callbackUrl || env.GOOGLE_CALLBACK_URL || '';
    } catch {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Exchange the authorization code for tokens, sending the code verifier.
    const { tokens } = await client.getToken({ code, codeVerifier, redirect_uri: callbackUrl });

    if (!tokens.id_token) {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Verify the ID token: signature, issuer, audience and expiry.
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as {
      iss?: string;
      aud?: string;
      exp?: number;
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    } | null;

    if (!payload || !payload.sub || !payload.email) {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Explicit issuer check (the library also enforces its default allowlist).
    if (!payload.iss || !GOOGLE_ISSUERS.includes(payload.iss)) {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Explicit audience check.
    if (!payload.aud || payload.aud !== env.GOOGLE_CLIENT_ID) {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Explicit expiry check.
    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Only accept accounts with a verified email.
    if (!payload.email_verified) {
      return redirectWithError(res, origin, 'google_failed');
    }

    // Import here to avoid circular dependency
    const { findOrCreateGoogleUser } = await import('../queryManager.js');

    const user = await findOrCreateGoogleUser({
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0] ?? 'user',
      picture: payload.picture,
      email_verified: payload.email_verified,
    });

    // Issue the app session via HttpOnly cookies. No token is placed in the URL.
    await issueSession(res, {
      id: user._id.toString(),
      email: user.email,
    });

    // Clean redirect: no query params, no fragments, no tokens.
    res.redirect(new URL('/', origin).toString());
  } catch (err) {
    next(err);
  }
}

/**
 * Redirect back to the frontend with a non-sensitive error marker.
 */
function redirectWithError(res: Response, origin: string, error: string): void {
  const errorUrl = new URL('/', origin);
  errorUrl.searchParams.set('error', error);
  res.redirect(errorUrl.toString());
}

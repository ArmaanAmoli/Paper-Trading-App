import { OAuth2Client } from 'google-auth-library';
import { getEnv } from './env.js';
import { AppError } from './errors.js';
import type { Request, Response, NextFunction } from 'express';

// Lazy initialization of OAuth2Client - only created when needed
let oauth2Client: OAuth2Client | null = null;

function getOAuth2Client(): OAuth2Client {
  if (!oauth2Client) {
    const env = getEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
      throw new AppError(503, 'Google OAuth is not configured');
    }
    oauth2Client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL
    );
  }
  return oauth2Client;
}

/**
 * Generate a random state string for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * GET /api/auth/google
 * Redirects to Google's consent screen
 */
export async function googleAuthStart(req: Request, res: Response, next: NextFunction) {
  try {
    const client = getOAuth2Client();
    const env = getEnv();

    const state = generateState();
    
    // Store state in a short-lived httpOnly cookie (10 minutes)
    res.cookie('google_oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
    });

    // Capture the origin the user came from so we can redirect back
    // to the same origin after OAuth. localhost and 127.0.0.1 are
    // treated as different origins by browsers, so localStorage is
    // not shared between them.
    const origin = req.headers.referer
      ? new URL(req.headers.referer).origin
      : env.FRONTEND_URL;
    res.cookie('google_oauth_origin', origin, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
    });

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'consent',
    });

    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/google/callback
 * Handles the callback from Google after user consent
 */
export async function googleAuthCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const client = getOAuth2Client();
    const env = getEnv();
    // Redirect back to the origin the user came from, so the token
    // is stored under the same origin the user will return to.
    const frontendUrl = req.cookies?.google_oauth_origin || env.FRONTEND_URL || 'http://localhost:5173';

    // Verify state parameter to prevent CSRF
    const state = req.cookies?.google_oauth_state;
    const returnedState = req.query.state;
    
    // Clear OAuth cookies immediately
    res.clearCookie('google_oauth_state', { path: '/' });
    res.clearCookie('google_oauth_origin', { path: '/' });

    if (!state || !returnedState || state !== returnedState) {
      const errorUrl = new URL('/login', frontendUrl);
      errorUrl.searchParams.set('error', 'google_failed');
      return res.redirect(errorUrl.toString());
    }

    const code = req.query.code;
    if (!code || typeof code !== 'string') {
      const errorUrl = new URL('/login', frontendUrl);
      errorUrl.searchParams.set('error', 'google_failed');
      return res.redirect(errorUrl.toString());
    }

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      const errorUrl = new URL('/login', frontendUrl);
      errorUrl.searchParams.set('error', 'google_failed');
      return res.redirect(errorUrl.toString());
    }

    // Only accept accounts with verified email
    if (!payload.email_verified) {
      const errorUrl = new URL('/login', frontendUrl);
      errorUrl.searchParams.set('error', 'google_failed');
      return res.redirect(errorUrl.toString());
    }

    // Import here to avoid circular dependency
    const { findOrCreateGoogleUser } = await import('../queryManager.js');
    const { default: jwt } = await import('jsonwebtoken');

    // Find or create user
    const user = await findOrCreateGoogleUser({
      id: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
      email_verified: payload.email_verified,
    });

    // Generate JWT token (same as normal login)
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Redirect to frontend with token in query param
    // The frontend will store the token and redirect to home
    const successUrl = new URL('/', frontendUrl);
    successUrl.searchParams.set('token', token);
    res.redirect(successUrl.toString());
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const errorUrl = new URL('/login', frontendUrl);
    errorUrl.searchParams.set('error', 'google_failed');
    res.redirect(errorUrl.toString());
  }
}

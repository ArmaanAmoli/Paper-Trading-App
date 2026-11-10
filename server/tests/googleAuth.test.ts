import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Set before any module under test is evaluated: getEnv() reads process.env
// lazily on first use, and vi.hoisted runs ahead of the imports below.
vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5173/api/auth/google/callback';
  process.env.FRONTEND_URL = 'http://localhost:5173';
});

// Capture the options the handlers pass to the Google client so tests can
// assert on redirect_uri / code_verifier without any network access.
const googleCalls = vi.hoisted(() => ({
  generateAuthUrl: [] as Array<Record<string, unknown>>,
  getToken: [] as Array<Record<string, unknown>>,
}));

vi.mock('google-auth-library', () => {
  class OAuth2Client {
    constructor(..._args: unknown[]) {}

    generateAuthUrl(opts: Record<string, unknown>): string {
      googleCalls.generateAuthUrl.push(opts);
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(opts)) {
        params.set(key, String(value));
      }
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async getToken(opts: Record<string, unknown>) {
      googleCalls.getToken.push(opts);
      return { tokens: { id_token: 'mock-id-token' } };
    }

    async verifyIdToken() {
      return {
        getPayload: () => ({
          iss: 'accounts.google.com',
          aud: 'test-google-client-id',
          exp: Math.floor(Date.now() / 1000) + 3600,
          sub: 'google-sub-123',
          email: 'googleuser@example.com',
          name: 'Google User',
          email_verified: true,
        }),
      };
    }
  }

  return { OAuth2Client, CodeChallengeMethod: { S256: 'S256' } };
});

import { googleAuthStart, googleAuthCallback } from '../lib/googleAuth.ts';
import { OAuthTransaction } from '../Schemas/mongoSchema.ts';

interface MockResponse {
  cookies: Record<string, { value: string; options: unknown }>;
  clearedCookies: Array<{ name: string; options: unknown }>;
  redirectUrl?: string;
  cookie(name: string, value: string, options: unknown): MockResponse;
  clearCookie(name: string, options: unknown): MockResponse;
  redirect(url: string): MockResponse;
}

function mockRes(): MockResponse {
  const cookies: Record<string, { value: string; options: unknown }> = {};
  const clearedCookies: Array<{ name: string; options: unknown }> = [];
  const res: MockResponse = {
    cookies,
    clearedCookies,
    redirectUrl: undefined,
    cookie(name: string, value: string, options: unknown) {
      cookies[name] = { value, options };
      return res;
    },
    clearCookie(name: string, options: unknown) {
      clearedCookies.push({ name, options });
      return res;
    },
    redirect(url: string) {
      res.redirectUrl = url;
      return res;
    },
  };
  return res;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, cookies: {}, query: {}, ...overrides } as unknown as Request;
}

const throwNext: NextFunction = (err?: unknown) => {
  throw err instanceof Error ? err : new Error(String(err));
};

async function startFlow(referer: string | undefined) {
  const req = mockReq(referer ? { headers: { referer } } : {});
  const res = mockRes();
  await googleAuthStart(req, res as unknown as Response, throwNext);
  const authUrl = new URL(res.redirectUrl as string);
  const transactionId = res.cookies['google_oauth_tx']?.value;
  return { res, authUrl, transactionId };
}

describe('GET /api/auth/google (start)', () => {
  beforeEach(() => {
    googleCalls.generateAuthUrl.length = 0;
    googleCalls.getToken.length = 0;
  });

  it('derives redirect_uri from a 127.0.0.1 request origin', async () => {
    const { res, authUrl, transactionId } = await startFlow('http://127.0.0.1:5173/');

    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://127.0.0.1:5173/api/auth/google/callback',
    );
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authUrl.searchParams.get('code_challenge')).toBeTruthy();
    expect(authUrl.searchParams.get('state')).toBeTruthy();
    expect(transactionId).toBeTruthy();
    expect(res.cookies['google_oauth_tx']).toBeDefined();

    // The transaction record must carry the same origin/callback URL so the
    // callback can reuse the exact redirect_uri in the token exchange.
    const record = await OAuthTransaction.findOne({ transactionId });
    expect(record).not.toBeNull();
    expect(record?.origin).toBe('http://127.0.0.1:5173');
    expect(record?.callbackUrl).toBe('http://127.0.0.1:5173/api/auth/google/callback');
  });

  it('keeps the localhost callback when started from localhost', async () => {
    const { authUrl, transactionId } = await startFlow('http://localhost:5173/');

    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/auth/google/callback',
    );
    const record = await OAuthTransaction.findOne({ transactionId });
    expect(record?.origin).toBe('http://localhost:5173');
    expect(record?.callbackUrl).toBe('http://localhost:5173/api/auth/google/callback');
  });

  it('falls back to the configured frontend origin for a non-allowlisted referer', async () => {
    const { authUrl, transactionId } = await startFlow('http://evil.example.com/');

    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/auth/google/callback',
    );
    const record = await OAuthTransaction.findOne({ transactionId });
    expect(record?.origin).toBe('http://localhost:5173');
  });

  it('falls back to the configured frontend origin when no referer is present', async () => {
    const { authUrl } = await startFlow(undefined);
    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/api/auth/google/callback',
    );
  });
});

describe('GET /api/auth/google/callback', () => {
  beforeEach(() => {
    googleCalls.generateAuthUrl.length = 0;
    googleCalls.getToken.length = 0;
  });

  it('exchanges the code with the stored redirect_uri, sets session cookies on the callback host, and redirects to the start origin', async () => {
    // Start the flow as a user browsing http://127.0.0.1:5173
    const { authUrl, transactionId } = await startFlow('http://127.0.0.1:5173/');
    const state = authUrl.searchParams.get('state') as string;

    // Google returns the browser to the 127.0.0.1 callback with the tx cookie
    const req = mockReq({
      headers: { referer: 'https://accounts.google.com/' },
      cookies: { google_oauth_tx: transactionId },
      query: { code: 'mock-auth-code', state },
    });
    const res = mockRes();
    await googleAuthCallback(req, res as unknown as Response, throwNext);

    // Token exchange must reuse the exact redirect_uri sent to Google
    expect(googleCalls.getToken).toHaveLength(1);
    expect(googleCalls.getToken[0].redirect_uri).toBe(
      'http://127.0.0.1:5173/api/auth/google/callback',
    );
    expect(googleCalls.getToken[0].code).toBe('mock-auth-code');
    expect(typeof googleCalls.getToken[0].codeVerifier).toBe('string');

    // Session cookies are set on this response (host = 127.0.0.1 for the browser)
    expect(res.cookies['access_token']).toBeDefined();
    expect(res.cookies['refresh_token']).toBeDefined();
    expect((res.cookies['access_token'].options as { path: string }).path).toBe('/');
    expect((res.cookies['refresh_token'].options as { path: string }).path).toBe('/auth');

    // Clean redirect back to the origin the user started from
    expect(res.redirectUrl).toBe('http://127.0.0.1:5173/');

    // Transaction is single-use
    expect(await OAuthTransaction.findOne({ transactionId })).toBeNull();
    // The temporary tx cookie is cleared
    expect(res.clearedCookies.some((c) => c.name === 'google_oauth_tx')).toBe(true);
  });

  it('redirects with google_failed when the transaction cookie is missing', async () => {
    const req = mockReq({
      headers: { referer: 'https://accounts.google.com/' },
      query: { code: 'mock-auth-code', state: 'whatever' },
    });
    const res = mockRes();
    await googleAuthCallback(req, res as unknown as Response, throwNext);

    expect(res.redirectUrl).toBe('http://localhost:5173/?error=google_failed');
    expect(googleCalls.getToken).toHaveLength(0);
    expect(res.cookies['access_token']).toBeUndefined();
  });

  it('redirects with google_failed when the state does not match', async () => {
    const { transactionId } = await startFlow('http://127.0.0.1:5173/');

    const req = mockReq({
      headers: { referer: 'https://accounts.google.com/' },
      cookies: { google_oauth_tx: transactionId },
      query: { code: 'mock-auth-code', state: 'forged-state' },
    });
    const res = mockRes();
    await googleAuthCallback(req, res as unknown as Response, throwNext);

    // The transaction was not consumed, so the redirect falls back to the
    // configured FRONTEND_URL rather than an untrusted origin.
    expect(res.redirectUrl).toBe('http://localhost:5173/?error=google_failed');
    expect(googleCalls.getToken).toHaveLength(0);
  });
});

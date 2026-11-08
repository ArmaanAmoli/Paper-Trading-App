import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { makeApp, authCookie, createTestUser, setCookies } from './helpers/index.js';
import { AuthCode, RefreshToken, User } from '../Schemas/mongoSchema.ts';
import { deriveCodeChallenge, generateCodeVerifier } from '../lib/pkce.ts';

let app: ReturnType<typeof makeApp>['app'];

beforeEach(() => {
  app = makeApp().app;
});

function signup(payload: Record<string, unknown>) {
  return supertest(app).post('/sign-up').send(payload);
}

async function createPkceLogin(payload: {
  email: string;
  password: string;
  verifier?: string;
  challenge?: string;
  method?: string;
}) {
  const verifier = payload.verifier ?? generateCodeVerifier();
  const challenge = payload.challenge ?? deriveCodeChallenge(verifier);

  const loginRes = await supertest(app)
    .post('/auth/login')
    .send({
      email: payload.email,
      password: payload.password,
      code_challenge: challenge,
      code_challenge_method: payload.method ?? 'S256',
    });

  return { verifier, challenge, loginRes };
}

describe('POST /sign-up', () => {
  it('registers a new user with default balance and authProvider local', async () => {
    const res = await signup({
      email: 'alice@example.com',
      password: 'Password123!',
      username: 'alice',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'User Registered' });

    const user = await User.findOne({ email: 'alice@example.com' });
    expect(user).toBeTruthy();
    expect(user?.balance).toBe(1_000_000);
    expect(user?.authProvider).toBe('local');
    expect(user?.passwordHash).toBeTruthy();
  });

  it('rejects missing email', async () => {
    const res = await signup({ password: 'Password123!', username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects invalid email', async () => {
    const res = await signup({
      email: 'not-an-email',
      password: 'Password123!',
      username: 'alice',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects password shorter than 8 characters', async () => {
    const res = await signup({ email: 'alice@example.com', password: 'short', username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects duplicate email', async () => {
    await signup({ email: 'alice@example.com', password: 'Password123!', username: 'alice' });
    const res = await signup({
      email: 'alice@example.com',
      password: 'Password123!',
      username: 'bob',
    });
    expect(res.status).toBe(500);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await signup({ email: 'dave@example.com', password: 'Password123!', username: 'dave' });
  });

  it('returns a one-time authorization code for valid credentials', async () => {
    const { loginRes } = await createPkceLogin({
      email: 'dave@example.com',
      password: 'Password123!',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.message).toBe('Login Success');
    expect(typeof loginRes.body.code).toBe('string');
    expect(loginRes.body.code.length).toBeGreaterThan(0);
    expect(await AuthCode.countDocuments({ used: false })).toBe(1);
  });

  it('rejects wrong password', async () => {
    const { loginRes } = await createPkceLogin({
      email: 'dave@example.com',
      password: 'WrongPassword123!',
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toBe('Incorrect Password');
  });

  it('rejects unknown user', async () => {
    const { loginRes } = await createPkceLogin({
      email: 'nobody@example.com',
      password: 'Password123!',
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toBe('Incorrect Password');
  });

  it('rejects Google-only user with no password', async () => {
    await createTestUser({
      email: 'google@example.com',
      username: 'googleuser',
      passwordHash: null,
      authProvider: 'google',
    });

    const { loginRes } = await createPkceLogin({
      email: 'google@example.com',
      password: 'anything',
    });

    expect(loginRes.status).toBe(400);
    expect(loginRes.body.message).toContain('Google sign-in');
  });

  it('rejects a non-S256 challenge method', async () => {
    const { loginRes } = await createPkceLogin({
      email: 'dave@example.com',
      password: 'Password123!',
      method: 'plain',
    });

    expect(loginRes.status).toBe(400);
    expect(loginRes.body.message).toBe('Validation failed');
  });

  it('rejects a short code challenge', async () => {
    const { loginRes } = await createPkceLogin({
      email: 'dave@example.com',
      password: 'Password123!',
      challenge: 'short',
    });

    expect(loginRes.status).toBe(400);
    expect(loginRes.body.message).toBe('Validation failed');
  });
});

describe('POST /auth/token', () => {
  beforeEach(async () => {
    await signup({ email: 'eve@example.com', password: 'Password123!', username: 'eve' });
  });

  it('exchanges a valid code and verifier for HttpOnly session cookies', async () => {
    const { verifier, loginRes } = await createPkceLogin({
      email: 'eve@example.com',
      password: 'Password123!',
    });

    const res = await supertest(app).post('/auth/token').send({
      code: loginRes.body.code,
      code_verifier: verifier,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Tokens issued' });

    const cookies = setCookies(res);
    expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes('HttpOnly'))).toBe(true);
    expect(res.body.token).toBeUndefined();
    expect(await AuthCode.countDocuments({})).toBe(0);
  });

  it('rejects an invalid verifier', async () => {
    const { loginRes } = await createPkceLogin({
      email: 'eve@example.com',
      password: 'Password123!',
    });

    const res = await supertest(app).post('/auth/token').send({
      code: loginRes.body.code,
      code_verifier: generateCodeVerifier(),
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('code_verifier does not match the authorization code');
  });

  it('rejects code reuse', async () => {
    const { verifier, loginRes } = await createPkceLogin({
      email: 'eve@example.com',
      password: 'Password123!',
    });

    const first = await supertest(app).post('/auth/token').send({
      code: loginRes.body.code,
      code_verifier: verifier,
    });
    expect(first.status).toBe(200);

    const second = await supertest(app).post('/auth/token').send({
      code: loginRes.body.code,
      code_verifier: verifier,
    });
    expect(second.status).toBe(401);
  });
});

describe('session cookies and protected routes', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeEach(async () => {
    await signup({ email: 'frank@example.com', password: 'Password123!', username: 'frank' });
    const { verifier, loginRes } = await createPkceLogin({
      email: 'frank@example.com',
      password: 'Password123!',
    });

    const tokenRes = await supertest(app).post('/auth/token').send({
      code: loginRes.body.code,
      code_verifier: verifier,
    });
    expect(tokenRes.status).toBe(200);

    const cookies = setCookies(tokenRes);
    accessToken = cookies.find((cookie) => cookie.startsWith('access_token='))!.split(';')[0];
    refreshToken = cookies.find((cookie) => cookie.startsWith('refresh_token='))!.split(';')[0];
  });

  it('returns user data for a valid access cookie', async () => {
    const res = await supertest(app).get('/user-data').set('Cookie', accessToken);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('frank@example.com');
    expect(res.body.balance).toBe(1_000_000);
  });

  it('rejects protected routes without an access cookie', async () => {
    const res = await supertest(app).get('/user-data');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('rejects an invalid access cookie', async () => {
    const res = await supertest(app).get('/user-data').set('Cookie', 'access_token=not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('rejects an expired access cookie', async () => {
    const user = await User.findOne({ email: 'frank@example.com' });
    const expired = jwt.sign(
      { userId: user!._id.toString(), email: user!.email },
      process.env.JWT_SECRET!,
      { expiresIn: '-1s' },
    );

    const res = await supertest(app).get('/user-data').set(authCookie(expired));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token expired');
  });

  it('rotates the refresh token and issues a new access token', async () => {
    const res = await supertest(app).post('/auth/refresh').set('Cookie', refreshToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Token refreshed' });

    const cookies = setCookies(res);
    expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true);
  });

  it('tolerates a concurrent refresh of a just-rotated token (grace window)', async () => {
    // Two tabs refreshing at nearly the same moment: the second tab presents
    // the token that the first tab just rotated away. Within the grace window
    // this must succeed instead of revoking the whole family.
    const first = await supertest(app).post('/auth/refresh').set('Cookie', refreshToken);
    expect(first.status).toBe(200);

    const second = await supertest(app).post('/auth/refresh').set('Cookie', refreshToken);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ message: 'Token refreshed' });

    // The family survives: the new tokens are not revoked
    const stored = await RefreshToken.find({ revoked: false });
    expect(stored.length).toBeGreaterThan(0);
  });

  it('revokes the family when a revoked token is reused after the grace window', async () => {
    const first = await supertest(app).post('/auth/refresh').set('Cookie', refreshToken);
    expect(first.status).toBe(200);

    // Backdate the revocation beyond the grace window (simulates replay later)
    const rawRefreshToken = refreshToken.split('=')[1];
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date(Date.now() - 31_000) });

    const second = await supertest(app).post('/auth/refresh').set('Cookie', refreshToken);
    expect(second.status).toBe(401);
    expect(second.body.message).toContain('family revoked');

    const stored = await RefreshToken.find({ revoked: true });
    expect(stored.length).toBeGreaterThan(0);
  });

  it('logs out and clears session cookies', async () => {
    const res = await supertest(app).post('/auth/logout').set('Cookie', refreshToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Logged out' });

    const cookies = setCookies(res);
    expect(cookies.some((cookie) => cookie.startsWith('access_token=;'))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refresh_token=;'))).toBe(true);
    expect(await RefreshToken.countDocuments({ revoked: true })).toBeGreaterThan(0);
  });

  it('deletes the account and revokes refresh tokens', async () => {
    const res = await supertest(app).delete('/user/me').set('Cookie', accessToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Account deleted successfully' });
    expect(await User.findOne({ email: 'frank@example.com' })).toBeNull();
    expect(await RefreshToken.countDocuments({})).toBe(0);
  });
});

describe('POST /auth/ws-ticket', () => {
  let accessToken: string;

  beforeEach(async () => {
    await signup({ email: 'grace@example.com', password: 'Password123!', username: 'grace' });
    const { verifier, loginRes } = await createPkceLogin({
      email: 'grace@example.com',
      password: 'Password123!',
    });

    const tokenRes = await supertest(app).post('/auth/token').send({
      code: loginRes.body.code,
      code_verifier: verifier,
    });
    expect(tokenRes.status).toBe(200);

    const cookies = setCookies(tokenRes);
    accessToken = cookies.find((cookie) => cookie.startsWith('access_token='))!.split(';')[0];
  });

  it('rejects requests without an access cookie', async () => {
    const res = await supertest(app).post('/auth/ws-ticket');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('issues a short-lived ws-scoped JWT for a valid session', async () => {
    const res = await supertest(app).post('/auth/ws-ticket').set('Cookie', accessToken);

    expect(res.status).toBe(200);
    expect(typeof res.body.ticket).toBe('string');

    const user = await User.findOne({ email: 'grace@example.com' });
    const decoded = jwt.verify(res.body.ticket, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      scope?: string;
      exp?: number;
    };

    expect(decoded.userId).toBe(user!._id.toString());
    expect(decoded.email).toBe('grace@example.com');
    expect(decoded.scope).toBe('ws');
    // Short-lived: well under the 15m access-token lifetime
    expect(decoded.exp! - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(5 * 60);
  });

  it('rejects the ws ticket as an API access token', async () => {
    const ticketRes = await supertest(app).post('/auth/ws-ticket').set('Cookie', accessToken);
    expect(ticketRes.status).toBe(200);

    const res = await supertest(app)
      .get('/user-data')
      .set('Cookie', `access_token=${ticketRes.body.ticket}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });
});

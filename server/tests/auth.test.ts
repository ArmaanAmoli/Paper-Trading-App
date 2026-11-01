import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { makeApp, authHeader, createTestUser } from './helpers/index.js';
import { User } from '../Schemas/mongoSchema.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

let app: ReturnType<typeof makeApp>['app'];

beforeEach(async () => {
  app = makeApp().app;
});

afterEach(async () => {
  await User.deleteMany({});
});

function signup(payload: Record<string, unknown>) {
  return supertest(app).post('/sign-up').send(payload);
}

function login(payload: Record<string, unknown>) {
  return supertest(app).post('/login').send(payload);
}

function getUserData(token: string) {
  return supertest(app).get('/user-data').set(authHeader(token));
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
    expect(user!.balance).toBe(1_000_000);
    expect(user!.authProvider).toBe('local');
    expect(user!.passwordHash).toBeTruthy();
    expect(user!.passwordHash).not.toBe('Password123!'); // hashed
  });

  it('rejects missing email', async () => {
    const res = await signup({ password: 'Password123!', username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects invalid email', async () => {
    const res = await signup({ email: 'not-an-email', password: 'Password123!', username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects password shorter than 8 characters', async () => {
    const res = await signup({ email: 'alice@example.com', password: 'short', username: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects username shorter than 3 characters', async () => {
    const res = await signup({ email: 'alice@example.com', password: 'Password123!', username: 'ab' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects duplicate email', async () => {
    await signup({ email: 'alice@example.com', password: 'Password123!', username: 'alice' });
    const res = await signup({ email: 'alice@example.com', password: 'Password123!', username: 'bob' });
    expect(res.status).toBe(500); // Mongoose unique constraint violation
  });

  it('rejects duplicate username', async () => {
    await signup({ email: 'alice@example.com', password: 'Password123!', username: 'alice' });
    const res = await signup({ email: 'bob@example.com', password: 'Password123!', username: 'alice' });
    expect(res.status).toBe(500); // Mongoose unique constraint violation
  });

  it('hashes password with bcrypt (salt 10)', async () => {
    await signup({ email: 'carol@example.com', password: 'Password123!', username: 'carol' });
    const user = await User.findOne({ email: 'carol@example.com' });
    const match = await bcrypt.compare('Password123!', user!.passwordHash!);
    expect(match).toBe(true);
  });
});

describe('POST /login', () => {
  beforeEach(async () => {
    await signup({ email: 'dave@example.com', password: 'Password123!', username: 'dave' });
  });

  it('logs in with valid credentials and returns JWT', async () => {
    const res = await login({ email: 'dave@example.com', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login Success');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('rejects wrong password', async () => {
    const res = await login({ email: 'dave@example.com', password: 'WrongPassword123!' });
    expect(res.status).toBe(500); // docs say 401 but code throws generic Error
    expect(res.body.message).toBe('Incorrect Password');
  });

  it('rejects unknown user', async () => {
    const res = await login({ email: 'nobody@example.com', password: 'Password123!' });
    expect(res.status).toBe(500); // docs say 401 but code returns null
    expect(res.body.message).toBe('Incorrect Password');
  });

  it('rejects Google-only user with no password', async () => {
    await createTestUser({
      email: 'google@example.com',
      username: 'googleuser',
      passwordHash: null,
      authProvider: 'google',
    });
    const res = await login({ email: 'google@example.com', password: 'anything' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Google sign-in');
  });

  it('rejects missing email', async () => {
    const res = await login({ password: 'Password123!' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects missing password', async () => {
    const res = await login({ email: 'dave@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });
});

describe('JWT creation and verification', () => {
  it('rejects request with no Authorization header', async () => {
    const res = await supertest(app).get('/user-data');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('rejects invalid token format', async () => {
    const res = await supertest(app)
      .get('/user-data')
      .set({ Authorization: 'NotBearer token123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token format');
  });

  it('rejects empty token after Bearer', async () => {
    const res = await supertest(app)
      .get('/user-data')
      .set({ Authorization: 'Bearer ' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token format');
  });

  it('rejects tampered token', async () => {
    const valid = jwt.sign(
      { userId: '000000000000000000000000', email: 'x@y.z' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const tampered = valid.slice(0, -5) + 'XXXXX';
    const res = await getUserData(tampered);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('rejects expired token', async () => {
    const expired = jwt.sign(
      { userId: '000000000000000000000000', email: 'x@y.z' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1s' },
    );
    const res = await getUserData(expired);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token expired');
  });

  it('accepts valid token and attaches user', async () => {
    const user = await createTestUser({
      email: 'eve@example.com',
      username: 'eve',
      password: 'Password123!',
    });
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const res = await getUserData(token);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('eve@example.com');
  });

  it('rejects token for deleted user', async () => {
    const user = await createTestUser({
      email: 'deleted@example.com',
      username: 'deleteduser',
      password: 'Password123!',
    });
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    await User.deleteOne({ _id: user._id });
    const res = await getUserData(token);
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('User not found');
  });
});

describe('GET /user-data (protected)', () => {
  it('returns 401 without token', async () => {
    const res = await supertest(app).get('/user-data');
    expect(res.status).toBe(401);
  });

  it('returns user data for valid token', async () => {
    const user = await createTestUser({
      email: 'frank@example.com',
      username: 'frank',
      password: 'Password123!',
    });
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const res = await getUserData(token);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(user._id.toString());
    expect(res.body.username).toBe('frank');
    expect(res.body.email).toBe('frank@example.com');
    expect(res.body.balance).toBe(1_000_000);
    expect(res.body.blockedMargin).toBe(0);
  });
});

describe('DELETE /user/me (account deletion)', () => {
  it('deletes authenticated user account', async () => {
    const user = await createTestUser({
      email: 'grace@example.com',
      username: 'grace',
      password: 'Password123!',
    });
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const res = await supertest(app)
      .delete('/user/me')
      .set(authHeader(token));
    expect(res.body).toEqual({ message: 'Account deleted successfully' });

    const remaining = await User.findOne({ email: 'grace@example.com' });
    expect(remaining).toBeNull();
  });

  it('returns 401 without token', async () => {
    const res = await supertest(app).delete('/user/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /logout', () => {
  it.todo('no server-side logout endpoint exists (JWT is stateless; logout is client-side localStorage removal)');
});

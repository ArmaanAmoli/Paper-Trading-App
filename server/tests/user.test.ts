import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { makeApp, authHeader, createTestUser } from './helpers/index.js';
import { User } from '../Schemas/mongoSchema.ts';
import { findOrCreateGoogleUser, saveSubscription } from '../queryManager.ts';

let app: ReturnType<typeof makeApp>['app'];
let user: Awaited<ReturnType<typeof createTestUser>>;
let token: string;

beforeEach(async () => {
  app = makeApp().app;
  user = await createTestUser({
    email: 'subscriber@example.com',
    username: 'subscriber',
    password: 'Password123!',
  });
  token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
});

describe('POST /save-subscription', () => {
  const subscription = {
    endpoint: 'https://push.example.com/endpoint',
    expirationTime: null,
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  };

  it('stores the push notification subscription on the user', async () => {
    const res = await supertest(app)
      .post('/save-subscription')
      .set(authHeader(token))
      .send({ data: subscription });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const updated = await User.findById(user._id);
    const sub = updated?.notificationSubscription;
    expect(sub).toBeTruthy();
    expect(sub?.endpoint).toBe(subscription.endpoint);
    expect(sub?.keys?.p256dh).toBe('p256dh-key');
    expect(sub?.keys?.auth).toBe('auth-key');
  });

  it('rejects a subscription without keys', async () => {
    const res = await supertest(app)
      .post('/save-subscription')
      .set(authHeader(token))
      .send({ data: { endpoint: 'https://push.example.com/endpoint', expirationTime: null } });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('requires authentication', async () => {
    const res = await supertest(app).post('/save-subscription').send({ data: subscription });
    expect(res.status).toBe(401);
  });
});

describe('saveSubscription (direct)', () => {
  it('throws a 404 AppError for a user that does not exist', async () => {
    await expect(
      saveSubscription('000000000000000000000000', {
        endpoint: 'https://push.example.com/endpoint',
        expirationTime: null,
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      }),
    ).rejects.toThrow('user not found');
  });
});

describe('GET /user-data with a notification subscription', () => {
  it('returns the stored subscription', async () => {
    await supertest(app)
      .post('/save-subscription')
      .set(authHeader(token))
      .send({
        data: {
          endpoint: 'https://push.example.com/endpoint',
          expirationTime: null,
          keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        },
      });

    const res = await supertest(app).get('/user-data').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.notificationSubscription).toEqual({
      endpoint: 'https://push.example.com/endpoint',
      expirationTime: null,
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    });
  });

  it('returns null when the user has no subscription', async () => {
    const res = await supertest(app).get('/user-data').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.notificationSubscription).toBeNull();
  });
});

describe('findOrCreateGoogleUser', () => {
  const profile = {
    id: 'google-oauth-id-1',
    email: 'google.user@example.com',
    name: 'Google User',
    picture: 'https://cdn.example.com/avatar.png',
    email_verified: true,
  };

  it('rejects a profile whose email is not verified', async () => {
    await expect(findOrCreateGoogleUser({ ...profile, email_verified: false })).rejects.toThrow(
      'Google account email is not verified',
    );
  });

  it('creates a new google user without a password', async () => {
    const created = await findOrCreateGoogleUser(profile);

    expect(created.googleId).toBe(profile.id);
    expect(created.email).toBe(profile.email);
    expect(created.username).toBe('googleuser');
    expect(created.authProvider).toBe('google');
    expect(created.avatar).toBe(profile.picture);
    expect(created.passwordHash).toBeUndefined();
    expect(created.balance).toBe(1_000_000);
  });

  it('returns the existing user for a known googleId and updates lastLogin', async () => {
    const first = await findOrCreateGoogleUser(profile);
    const before = first.lastLogin!.getTime();

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await findOrCreateGoogleUser(profile);

    expect(second._id.toString()).toBe(first._id.toString());
    expect(second.lastLogin!.getTime()).toBeGreaterThanOrEqual(before);
    expect(await User.countDocuments({ googleId: profile.id })).toBe(1);
  });

  it('links an existing local account by email and switches the provider', async () => {
    const local = await createTestUser({
      email: 'link.me@example.com',
      username: 'linkme',
      password: 'Password123!',
    });

    const linked = await findOrCreateGoogleUser({
      ...profile,
      email: 'link.me@example.com',
    });

    expect(linked._id.toString()).toBe(local._id.toString());
    expect(linked.googleId).toBe(profile.id);
    expect(linked.authProvider).toBe('google');
    expect(linked.avatar).toBe(profile.picture);
    // The existing password hash is preserved when linking.
    expect(linked.passwordHash).toBeTruthy();
  });

  it('uniquifies the username when it is already taken', async () => {
    await createTestUser({
      email: 'taken@example.com',
      username: 'googleuser',
      password: 'Password123!',
    });

    const created = await findOrCreateGoogleUser(profile);

    expect(created.username).toBe('googleuser1');
  });

  it('falls back to the email local part when the name has no letters', async () => {
    const created = await findOrCreateGoogleUser({
      ...profile,
      id: 'google-oauth-id-2',
      email: 'fallback@example.com',
      name: '---',
    });

    expect(created.username).toBe('fallback');
  });

  it('falls back to "user" when neither name nor email provides characters', async () => {
    const created = await findOrCreateGoogleUser({
      ...profile,
      id: 'google-oauth-id-3',
      // The email local part must also sanitise to an empty string, otherwise the
      // email fallback (not the "user" fallback) is used.
      email: '---@example.com',
      name: '!!!',
    });

    expect(created.username).toBe('user');
  });

  it('sanitises the username and caps it at 20 characters', async () => {
    const created = await findOrCreateGoogleUser({
      ...profile,
      id: 'google-oauth-id-4',
      email: 'long@example.com',
      name: 'A Very Long Google Display Name',
    });

    expect(created.username).toBe('averylonggoogledispl');
    expect(created.username.length).toBeLessThanOrEqual(20);
  });
});

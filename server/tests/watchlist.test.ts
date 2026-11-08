import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { makeApp, authCookie, createTestUser } from './helpers/index.js';
import { Watchlist } from '../Schemas/mongoSchema.ts';

let app: ReturnType<typeof makeApp>['app'];
let user: Awaited<ReturnType<typeof createTestUser>>;
let token: string;

beforeEach(async () => {
  app = makeApp().app;
  user = await createTestUser({
    email: 'watcher@example.com',
    username: 'watcher',
    password: 'Password123!',
  });
  token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
});

describe('POST /user-watchlist/add', () => {
  it('adds a symbol to the watchlist', async () => {
    const res = await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const watchlist = await Watchlist.findOne({ userId: user._id });
    expect(watchlist).toBeTruthy();
    expect(watchlist!.symbols).toEqual(['AAPL']);
  });

  it('is idempotent — adding the same symbol twice does not duplicate it', async () => {
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });

    const watchlist = await Watchlist.findOne({ userId: user._id });
    expect(watchlist!.symbols).toEqual(['AAPL']);
  });

  it('keeps multiple symbols on one watchlist document', async () => {
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'MSFT' });

    const watchlists = await Watchlist.find({ userId: user._id });
    expect(watchlists).toHaveLength(1);
    expect(watchlists[0].symbols.sort()).toEqual(['AAPL', 'MSFT']);
  });

  it('rejects an empty symbol', async () => {
    const res = await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('requires authentication', async () => {
    const res = await supertest(app).post('/user-watchlist/add').send({ symbol: 'AAPL' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /user-watchlist/delete', () => {
  it('removes a symbol from the watchlist', async () => {
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'MSFT' });

    const res = await supertest(app)
      .delete('/user-watchlist/delete')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const watchlist = await Watchlist.findOne({ userId: user._id });
    expect(watchlist!.symbols).toEqual(['MSFT']);
  });

  it('reports success even when the symbol is not on the watchlist', async () => {
    const res = await supertest(app)
      .delete('/user-watchlist/delete')
      .set(authCookie(token))
      .send({ symbol: 'NOPE' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('requires authentication', async () => {
    const res = await supertest(app).delete('/user-watchlist/delete').send({ symbol: 'AAPL' });
    expect(res.status).toBe(401);
  });
});

describe('GET /user-watchlist', () => {
  it('returns the watchlist of the authenticated user', async () => {
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });

    const res = await supertest(app).get('/user-watchlist').set(authCookie(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      userId: user._id.toString(),
      symbols: ['AAPL'],
    });
    expect(typeof res.body[0]._id).toBe('string');
  });

  it('returns an empty array when the user has no watchlist', async () => {
    const res = await supertest(app).get('/user-watchlist').set(authCookie(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('does not expose another user watchlist', async () => {
    const other = await createTestUser({
      email: 'other@example.com',
      username: 'otheruser',
      password: 'Password123!',
    });
    await supertest(app)
      .post('/user-watchlist/add')
      .set(authCookie(token))
      .send({ symbol: 'AAPL' });

    const otherToken = jwt.sign(
      { userId: other._id.toString(), email: other.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const res = await supertest(app).get('/user-watchlist').set(authCookie(otherToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('requires authentication', async () => {
    const res = await supertest(app).get('/user-watchlist');
    expect(res.status).toBe(401);
  });
});

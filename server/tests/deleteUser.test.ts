import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { makeApp, authHeader, createTestUser } from './helpers/index.js';
import { deleteUser } from '../queryManager.ts';
import { User, Trade, Portfolio, Watchlist, StopLoss } from '../Schemas/mongoSchema.ts';

let app: ReturnType<typeof makeApp>['app'];
let user: Awaited<ReturnType<typeof makeApp>>;
let token: string;

beforeEach(async () => {
  app = makeApp().app;
  user = await createTestUser({
    email: 'deleteuser@example.com',
    username: 'deleteuser',
    password: 'Password123!',
  });
  token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
});

describe('DELETE /user/me (direct route)', () => {
  it('deletes the user and cascades over associated data', async () => {
    await Trade.create({
      userId: user._id,
      symbol: 'AAPL',
      shares: 10,
      price: 150,
      type: 'buy',
      timestamp: new Date(),
      realizedPL: 0,
      orderId: 'order-1',
      wasStopLoss: false,
    });
    await Portfolio.create({
      userId: user._id,
      symbol: 'AAPL',
      shares: 10,
      avgPrice: 150,
      positionType: 'long',
      lastUpdated: new Date(),
    });
    await Watchlist.create({
      userId: user._id,
      symbols: ['AAPL', 'MSFT'],
    });
    await StopLoss.create({
      userId: user._id,
      symbol: 'AAPL',
      price: 90,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      qty: 5,
      type: 'sell',
    });

    const res = await app.delete('/user/me').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Account deleted successfully' });

    expect(await User.findById(user._id)).toBeNull();
    expect(await Trade.countDocuments({ userId: user._id })).toBe(0);
    expect(await Portfolio.countDocuments({ userId: user._id })).toBe(0);
    expect(await Watchlist.countDocuments({ userId: user._id })).toBe(0);
    expect(await StopLoss.countDocuments({ userId: user._id })).toBe(0);
  });

  it('requires authentication', async () => {
    const res = await app.delete('/user/me');
    expect(res.status).toBe(401);
  });
});

describe('deleteUser (direct)', () => {
  it('returns success true for an existing user', async () => {
    const result = await deleteUser(user._id.toString());
    expect(result).toEqual({ success: true });
    expect(await User.findById(user._id)).toBeNull();
  });

  it('throws AppError(404) for a user that does not exist', async () => {
    await deleteUser(user._id.toString());

    await expect(deleteUser(user._id.toString())).rejects.toThrow('User not found');
  });
});

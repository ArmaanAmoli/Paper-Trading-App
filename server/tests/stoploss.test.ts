import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { makeApp, authCookie, createTestUser } from './helpers/index.js';
import { StopLoss } from '../Schemas/mongoSchema.ts';
import { StopLossExecuter } from '../queryManager.ts';

// Push notifications are an external side effect of stop-loss execution.
vi.mock('../Services/notificationService.ts', () => ({
  sendPushNotification: vi.fn(),
}));

const { sendPushNotification } = await import('../Services/notificationService.ts');
const mockedSendPushNotification = vi.mocked(sendPushNotification);

let app: ReturnType<typeof makeApp>['app'];
let user: Awaited<ReturnType<typeof createTestUser>>;
let token: string;

beforeEach(async () => {
  app = makeApp().app;
  mockedSendPushNotification.mockReset();
  mockedSendPushNotification.mockResolvedValue({ success: true });
  user = await createTestUser({
    email: 'stoploss@example.com',
    username: 'stoplossuser',
    password: 'Password123!',
  });
  token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
});

describe('POST /stopLoss', () => {
  it('creates a stop loss order for the authenticated user', async () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z').toISOString();
    const res = await supertest(app)
      .post('/stopLoss')
      .set(authCookie(token))
      .send({ symbol: 'AAPL', price: 90, startDate, qty: 5, type: 'sell' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Stop loss order placed.' });

    const stopLoss = await StopLoss.findOne({ userId: user._id });
    expect(stopLoss).toBeTruthy();
    expect(stopLoss!.symbol).toBe('AAPL');
    expect(stopLoss!.price).toBe(90);
    expect(stopLoss!.qty).toBe(5);
    expect(stopLoss!.type).toBe('sell');
    expect(stopLoss!.startDate.toISOString()).toBe(startDate);
  });

  it('rejects a non-positive price', async () => {
    const res = await supertest(app).post('/stopLoss').set(authCookie(token)).send({
      symbol: 'AAPL',
      price: 0,
      startDate: new Date().toISOString(),
      qty: 5,
      type: 'sell',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects a missing startDate', async () => {
    const res = await supertest(app)
      .post('/stopLoss')
      .set(authCookie(token))
      .send({ symbol: 'AAPL', price: 90, qty: 5, type: 'sell' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects an unknown type', async () => {
    const res = await supertest(app).post('/stopLoss').set(authCookie(token)).send({
      symbol: 'AAPL',
      price: 90,
      startDate: new Date().toISOString(),
      qty: 5,
      type: 'hold',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('requires authentication', async () => {
    const res = await supertest(app).post('/stopLoss').send({
      symbol: 'AAPL',
      price: 90,
      startDate: new Date().toISOString(),
      qty: 5,
      type: 'sell',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /stopLoss', () => {
  it('returns only the stop loss orders of the authenticated user', async () => {
    const other = await createTestUser({
      email: 'other-sl@example.com',
      username: 'othersluser',
      password: 'Password123!',
    });
    await StopLoss.create({
      userId: user._id,
      symbol: 'AAPL',
      price: 90,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      qty: 5,
      type: 'sell',
    });
    await StopLoss.create({
      userId: other._id,
      symbol: 'MSFT',
      price: 300,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      qty: 2,
      type: 'buy',
    });

    const res = await supertest(app).get('/stopLoss').set(authCookie(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      userId: user._id.toString(),
      symbol: 'AAPL',
      price: 90,
      qty: 5,
      type: 'sell',
    });
    expect(typeof res.body[0]._id).toBe('string');
    expect(typeof res.body[0].startDate).toBe('string');
  });

  it('returns an empty array when there are no stop loss orders', async () => {
    const res = await supertest(app).get('/stopLoss').set(authCookie(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('requires authentication', async () => {
    const res = await supertest(app).get('/stopLoss');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /stopLoss/:id', () => {
  it('cancels a stop loss order', async () => {
    const created = await StopLoss.create({
      userId: user._id,
      symbol: 'AAPL',
      price: 90,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      qty: 5,
      type: 'sell',
    });

    const res = await supertest(app)
      .delete(`/stopLoss/${created._id.toString()}`)
      .set(authCookie(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Stop loss cancelled' });
    expect(await StopLoss.findById(created._id)).toBeNull();
  });

  it('cannot cancel a stop loss order that belongs to another user', async () => {
    const other = await createTestUser({
      email: 'other-sl2@example.com',
      username: 'othersluser2',
      password: 'Password123!',
    });
    const created = await StopLoss.create({
      userId: other._id,
      symbol: 'MSFT',
      price: 300,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      qty: 2,
      type: 'buy',
    });

    const res = await supertest(app)
      .delete(`/stopLoss/${created._id.toString()}`)
      .set(authCookie(token));

    // The delete is scoped to the authenticated user, so nothing is removed and the
    // handler throws a plain Error (500) instead of a 404.
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Stop loss not found');
    expect(await StopLoss.findById(created._id)).toBeTruthy();
  });

  it('reports an error for an unknown id', async () => {
    const res = await supertest(app)
      .delete('/stopLoss/000000000000000000000000')
      .set(authCookie(token));

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Stop loss not found');
  });

  it('requires authentication', async () => {
    const res = await supertest(app).delete('/stopLoss/000000000000000000000000');
    expect(res.status).toBe(401);
  });
});

describe('StopLossExecuter', () => {
  it('executes the trade, removes the order and notifies the user', async () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    await StopLoss.create({
      userId: user._id,
      symbol: 'AAPL',
      price: 90,
      startDate,
      qty: 5,
      type: 'sell',
    });

    const result = await StopLossExecuter({
      userId: user._id.toString(),
      symbol: 'AAPL',
      price: 90,
      startDate: startDate.toISOString(),
      qty: 5,
      type: 'sell',
    });

    expect(result).toEqual({ success: true });
    expect(await StopLoss.countDocuments({ userId: user._id })).toBe(0);
    expect(mockedSendPushNotification).toHaveBeenCalledTimes(1);
    expect(mockedSendPushNotification).toHaveBeenCalledWith(
      user._id.toString(),
      'Paper Trading App',
      'Stop Loss executed for AAPL at price 90',
    );
  });

  it('returns success false when the trade cannot be executed', async () => {
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    await StopLoss.create({
      userId: user._id,
      symbol: 'AAPL',
      price: 90,
      startDate,
      qty: 5,
      type: 'sell',
    });

    // A non-existent user makes executeTrade() throw, so the executor swallows the
    // error and reports failure. The stop loss order is left in place.
    const result = await StopLossExecuter({
      userId: '000000000000000000000000',
      symbol: 'AAPL',
      price: 90,
      startDate: startDate.toISOString(),
      qty: 5,
      type: 'sell',
    });

    expect(result).toEqual({ success: false });
    expect(await StopLoss.countDocuments({ userId: user._id })).toBe(1);
    expect(mockedSendPushNotification).not.toHaveBeenCalled();
  });
});

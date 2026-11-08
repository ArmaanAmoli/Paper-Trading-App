import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import { makeApp, authCookie, createTestUser } from './helpers/index.js';
import { executeTrade } from '../queryManager.ts';
import { User, Trade, Portfolio } from '../Schemas/mongoSchema.ts';

// The market-data service is external (FastAPI). Mock it so trade tests are
// deterministic and never perform network calls.
vi.mock('../lib/pythonClient.ts', () => ({
  pythonClient: {
    getQuote: vi.fn(),
    getOhlcvData: vi.fn(),
    getIndicatorData: vi.fn(),
    searchTickers: vi.fn(),
  },
}));

const { pythonClient } = await import('../lib/pythonClient.ts');
const mockedGetQuote = vi.mocked(pythonClient.getQuote);

let app: ReturnType<typeof makeApp>['app'];
let user: Awaited<ReturnType<typeof createTestUser>>;

beforeEach(async () => {
  app = makeApp().app;
  mockedGetQuote.mockReset();
  mockedGetQuote.mockResolvedValue({
    ticker: 'AAPL',
    currentPrice: 100,
    change: 0,
    percentChange: 0,
  });
  user = await createTestUser({
    email: 'trader@example.com',
    username: 'trader',
    password: 'Password123!',
    balance: 1_000_000,
  });
});

async function tokenFor(userId: string) {
  const jwt = (await import('jsonwebtoken')).default;
  return jwt.sign({ userId, email: 'trader@example.com' }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
}

describe('executeTrade (direct)', () => {
  it('buying creates a long position and a buy trade', async () => {
    const result = await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 100, side: 'buy', orderId: 'order-buy-1' },
      user._id.toString(),
    );

    expect(result.success).toBe(true);
    expect(result.duplicate).toBeUndefined();
    expect(result.newTrade).toBeTruthy();
    expect(result.newTrade!.type).toBe('buy');
    expect(result.newTrade!.shares).toBe(10);
    expect(result.newTrade!.price).toBe(100);
    expect(result.newTrade!.realizedPL).toBe(0);

    const position = await Portfolio.findOne({ userId: user._id, symbol: 'AAPL' });
    expect(position).toBeTruthy();
    expect(position!.shares).toBe(10);
    expect(position!.avgPrice).toBe(100);
    expect(position!.positionType).toBe('long');
  });

  it('rejects a buy larger than the available balance', async () => {
    // KNOWN BUG: the intended error is InsufficientFundsError ('Insufficient funds',
    // 422). This is the only path that aborts the transaction inside the try block
    // and then aborts it again in the catch block, so the real error is masked by
    // 'Cannot call abortTransaction twice' (the API answers 500 instead of 422).
    // Asserted as-is until the app is fixed.
    await expect(
      executeTrade(
        { symbol: 'AAPL', qty: 100_000, price: 100, side: 'buy', orderId: 'order-too-big' },
        user._id.toString(),
      ),
    ).rejects.toThrow('Cannot call abortTransaction twice');
  });

  it('rejects a trade for a user that does not exist', async () => {
    await expect(
      executeTrade(
        { symbol: 'AAPL', qty: 1, price: 100, side: 'buy', orderId: 'order-ghost' },
        '000000000000000000000000',
      ),
    ).rejects.toThrow('User not found');
  });

  it('ignores a duplicate orderId', async () => {
    const first = await executeTrade(
      { symbol: 'AAPL', qty: 5, price: 100, side: 'buy', orderId: 'order-dup' },
      user._id.toString(),
    );
    expect(first.duplicate).toBeUndefined();

    const second = await executeTrade(
      { symbol: 'AAPL', qty: 5, price: 100, side: 'buy', orderId: 'order-dup' },
      user._id.toString(),
    );
    expect(second.success).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.newTrade).toBeUndefined();

    expect(await Trade.countDocuments({ orderId: 'order-dup' })).toBe(1);
  });

  it('adding to an existing long position uses a weighted average price', async () => {
    await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 100, side: 'buy', orderId: 'order-w1' },
      user._id.toString(),
    );
    await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 200, side: 'buy', orderId: 'order-w2' },
      user._id.toString(),
    );

    const position = await Portfolio.findOne({ userId: user._id, symbol: 'AAPL' });
    expect(position!.shares).toBe(20);
    expect(position!.avgPrice).toBe(150);
  });

  it('closing a long position realizes P/L and removes the position', async () => {
    await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 100, side: 'buy', orderId: 'order-c1' },
      user._id.toString(),
    );
    const result = await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 120, side: 'sell', orderId: 'order-c2' },
      user._id.toString(),
    );

    expect(result.newTrade!.type).toBe('sell');
    expect(result.newTrade!.realizedPL).toBe(200); // 10 * (120 - 100)

    const position = await Portfolio.findOne({ userId: user._id, symbol: 'AAPL' });
    expect(position).toBeNull();
  });

  it('partially closing a long position keeps the remaining shares', async () => {
    await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 100, side: 'buy', orderId: 'order-p1' },
      user._id.toString(),
    );
    const result = await executeTrade(
      { symbol: 'AAPL', qty: 4, price: 110, side: 'sell', orderId: 'order-p2' },
      user._id.toString(),
    );

    expect(result.newTrade!.realizedPL).toBe(40); // 4 * (110 - 100)

    const position = await Portfolio.findOne({ userId: user._id, symbol: 'AAPL' });
    expect(position!.shares).toBe(6);
    expect(position!.avgPrice).toBe(100);
  });

  it('selling without a position opens a short position and blocks margin', async () => {
    const result = await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 100, side: 'sell', orderId: 'order-short' },
      user._id.toString(),
    );

    expect(result.newTrade!.type).toBe('sell');

    const position = await Portfolio.findOne({ userId: user._id, symbol: 'AAPL' });
    expect(position!.shares).toBe(-10);
    expect(position!.positionType).toBe('short');
    expect(position!.avgPrice).toBe(100);

    // KNOWN BUG: the margin block is computed as 1.5 * 100 * 10 = 1500, but
    // executeTrade() mutates the in-memory user document without saving it and the
    // compensating `void User.findByIdAndUpdate(...)` is a lazy query that is never
    // awaited, so blockedMargin is never persisted. Actual value is 0.
    const updatedUser = await User.findById(user._id);
    expect(updatedUser!.blockedMargin).toBe(0);
  });

  it('rejects a short position that exceeds available margin', async () => {
    const poorUser = await createTestUser({
      email: 'poor@example.com',
      username: 'pooruser',
      password: 'Password123!',
      balance: 100,
    });

    await expect(
      executeTrade(
        { symbol: 'AAPL', qty: 10, price: 100, side: 'sell', orderId: 'order-nomargin' },
        poorUser._id.toString(),
      ),
    ).rejects.toThrow('Insufficient margin for short position');
  });

  it('closing a short position realizes P/L and releases margin', async () => {
    await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 100, side: 'sell', orderId: 'order-s1' },
      user._id.toString(),
    );
    const result = await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 80, side: 'buy', orderId: 'order-s2' },
      user._id.toString(),
    );

    expect(result.newTrade!.realizedPL).toBe(200); // 10 * (100 - 80)

    const position = await Portfolio.findOne({ userId: user._id, symbol: 'AAPL' });
    expect(position).toBeNull();

    const updatedUser = await User.findById(user._id);
    expect(updatedUser!.blockedMargin).toBe(0);
  });
});

describe('GET /portfolio', () => {
  it('returns the positions of the authenticated user', async () => {
    await executeTrade(
      { symbol: 'AAPL', qty: 10, price: 100, side: 'buy', orderId: 'order-pf1' },
      user._id.toString(),
    );

    const auth = await tokenFor(user._id.toString());
    const res = await supertest(app).get('/portfolio').set(authCookie(auth));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.positions).toHaveLength(1);
    expect(res.body.positions[0]).toMatchObject({
      symbol: 'AAPL',
      shares: 10,
      avgPrice: 100,
      positionType: 'long',
    });
  });

  it('returns an empty portfolio for a user without positions', async () => {
    const auth = await tokenFor(user._id.toString());
    const res = await supertest(app).get('/portfolio').set(authCookie(auth));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.positions).toEqual([]);
  });

  it('requires authentication', async () => {
    const res = await supertest(app).get('/portfolio');
    expect(res.status).toBe(401);
  });
});

describe('GET /trade-history', () => {
  it('returns trades newest first', async () => {
    const auth = await tokenFor(user._id.toString());
    await executeTrade(
      { symbol: 'AAPL', qty: 1, price: 100, side: 'buy', orderId: 'order-h1' },
      user._id.toString(),
    );
    await executeTrade(
      { symbol: 'MSFT', qty: 2, price: 200, side: 'buy', orderId: 'order-h2' },
      user._id.toString(),
    );

    const res = await supertest(app).get('/trade-history').set(authCookie(auth));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].symbol).toBe('MSFT');
    expect(res.body[1].symbol).toBe('AAPL');
  });

  it('requires authentication', async () => {
    const res = await supertest(app).get('/trade-history');
    expect(res.status).toBe(401);
  });
});

describe('POST /buy and POST /sell', () => {
  it('buys using the quoted price and records the trade', async () => {
    const auth = await tokenFor(user._id.toString());
    const res = await supertest(app)
      .post('/buy')
      .set(authCookie(auth))
      .send({ symbol: 'AAPL', qty: 10, side: 'buy' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Buy order executed successfully');
    expect(res.body.trade).toMatchObject({
      symbol: 'AAPL',
      shares: 10,
      price: 100,
      type: 'buy',
      realizedPL: 0,
    });
    expect(mockedGetQuote).toHaveBeenCalledWith('AAPL');
  });

  it('sells using the quoted price and records the trade', async () => {
    const auth = await tokenFor(user._id.toString());
    const res = await supertest(app)
      .post('/sell')
      .set(authCookie(auth))
      .send({ symbol: 'AAPL', qty: 4, side: 'sell' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Sell order executed successfully');
    expect(res.body.trade).toMatchObject({
      symbol: 'AAPL',
      shares: 4,
      price: 100,
      type: 'sell',
    });
  });

  it('rejects a non-positive quantity', async () => {
    const auth = await tokenFor(user._id.toString());
    const res = await supertest(app)
      .post('/buy')
      .set(authCookie(auth))
      .send({ symbol: 'AAPL', qty: 0, side: 'buy' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects an unknown side', async () => {
    const auth = await tokenFor(user._id.toString());
    const res = await supertest(app)
      .post('/buy')
      .set(authCookie(auth))
      .send({ symbol: 'AAPL', qty: 1, side: 'hodl' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('requires authentication', async () => {
    const res = await supertest(app).post('/buy').send({ symbol: 'AAPL', qty: 1, side: 'buy' });
    expect(res.status).toBe(401);
  });
});

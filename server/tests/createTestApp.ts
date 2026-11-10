import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { route } from '../lib/route.ts';
import { getEnv } from '../lib/env.ts';
import { UnauthorizedError } from '../lib/errors.ts';
import {
  createAuthCode,
  consumeAuthCode,
  revokeAllRefreshTokens,
  revokeAllAuthCodes,
} from '../lib/authStore.ts';
import {
  issueSession,
  rotateSession,
  clearSession,
  issueWsTicket,
  REFRESH_TOKEN_COOKIE,
  AUTH_CODE_COOKIE,
  AUTH_CODE_PATH,
} from '../lib/session.ts';
import { csrfMiddleware, buildAllowedOrigins } from '../lib/csrf.ts';
import { rateLimit } from '../lib/rateLimit.ts';
import { getCookie, authCodeCookieOptions, clearCookieOptions } from '../lib/cookies.ts';
import {
  signUpEndpoint,
  userDataEndpoint,
  saveSubscriptionEndpoint,
  deleteAccountEndpoint,
  loginPkceEndpoint,
  tokenExchangeBodySchema,
  wsTicketEndpoint,
} from '../../shared/contract/auth.ts';
import {
  buyEndpoint,
  sellEndpoint,
  portfolioEndpoint,
  tradeHistoryEndpoint,
  stopLossEndpoint,
  getStopLossEndpoint,
  deleteStopLossEndpoint,
} from '../../shared/contract/trade.ts';
import {
  userWatchlistEndpoint,
  addToWatchlistEndpoint,
  deleteFromWatchlistEndpoint,
} from '../../shared/contract/watchlist.ts';
import {
  quoteEndpoint,
  dataEndpoint,
  searchEndpoint,
  indicatorEndpoint,
} from '../../shared/contract/market.ts';
import {
  SignUp,
  login,
  portfolio,
  executeTrade,
  GetUserData,
  GetTradeHistory,
  GetUserWatchlist,
  AddToWatchlist,
  RemoveFromWatchlist,
  saveSubscription,
  getUserStopLosses,
  deleteStopLoss,
  deleteUser,
} from '../queryManager.ts';
import { pythonClient } from '../lib/pythonClient.ts';
import { googleAuthStart, googleAuthCallback } from '../lib/googleAuth.ts';
import { StopLoss, User } from '../Schemas/mongoSchema.ts';

import type { NextFunction, Request, Response } from 'express';

export interface TestApp {
  app: ReturnType<typeof express>;
  createToken: (payload: { userId: string; email: string }) => string;
}

const env = getEnv();

function buildApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  const allowedOrigins = buildAllowedOrigins();
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(csrfMiddleware(allowedOrigins));
  app.use(
    '/auth',
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      message: 'Too many auth requests, please try again later',
    }),
  );

  app.post(
    '/sign-up',
    route(signUpEndpoint, async ({ body }) => {
      await SignUp(body);
      return { message: 'User Registered' as const };
    }),
  );

  // --- PKCE-based email/password login ---

  app.post(
    '/auth/login',
    route(loginPkceEndpoint, async ({ body, res }) => {
      const user = await login({ email: body.email, password: body.password });
      if (!user) {
        throw new UnauthorizedError('Incorrect Password');
      }

      const code = await createAuthCode({
        userId: user._id.toString(),
        codeChallenge: body.code_challenge,
      });

      res.cookie(AUTH_CODE_COOKIE, code, authCodeCookieOptions(AUTH_CODE_PATH));

      return { message: 'Login Success' as const };
    }),
  );

  app.post('/auth/token', async (req, res, next) => {
    try {
      const body = tokenExchangeBodySchema.parse(req.body);

      const code = getCookie(req, AUTH_CODE_COOKIE);
      res.clearCookie(AUTH_CODE_COOKIE, clearCookieOptions(AUTH_CODE_PATH));
      if (!code) {
        throw new UnauthorizedError('Invalid or expired authorization code');
      }

      const { userId } = await consumeAuthCode({
        code,
        codeVerifier: body.code_verifier,
      });

      const user = await User.findById(userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      await issueSession(res, {
        id: user._id.toString(),
        email: user.email,
      });

      res.json({ message: 'Tokens issued' as const });
    } catch (err) {
      next(err);
    }
  });

  app.post('/auth/refresh', async (req, res, next) => {
    try {
      const refreshToken = getCookie(req, REFRESH_TOKEN_COOKIE);
      if (!refreshToken) {
        throw new UnauthorizedError('No refresh token provided');
      }

      await rotateSession(res, refreshToken);

      res.json({ message: 'Token refreshed' as const });
    } catch (err) {
      next(err);
    }
  });

  app.post('/auth/logout', async (req, res, next) => {
    try {
      const refreshToken = getCookie(req, REFRESH_TOKEN_COOKIE);
      await clearSession(res, refreshToken);

      res.json({ message: 'Logged out' as const });
    } catch (err) {
      next(err);
    }
  });

  app.post(
    '/auth/ws-ticket',
    route(wsTicketEndpoint, ({ user }) => {
      return Promise.resolve({ ticket: issueWsTicket({ userId: user.userId, email: user.email }) });
    }),
  );

  app.get('/api/auth/google', googleAuthStart);
  app.get('/api/auth/google/callback', googleAuthCallback);

  app.get(
    '/user-data',
    route(userDataEndpoint, async ({ user }) => {
      const userData = await GetUserData(user.userId);
      if (!userData) throw new Error('User not found');
      return {
        _id: userData._id.toString(),
        username: userData.username,
        email: userData.email,
        balance: userData.balance,
        blockedMargin: userData.blockedMargin,
        createdAt: userData.createdAt.toISOString(),
        lastLogin: userData.lastLogin ? userData.lastLogin.toISOString() : null,
        notificationSubscription: userData.notificationSubscription
          ? {
              endpoint: userData.notificationSubscription.endpoint,
              expirationTime: userData.notificationSubscription.expirationTime ?? null,
              keys: userData.notificationSubscription.keys
                ? {
                    p256dh: userData.notificationSubscription.keys.p256dh,
                    auth: userData.notificationSubscription.keys.auth,
                  }
                : { p256dh: '', auth: '' },
            }
          : null,
      };
    }),
  );

  app.post(
    '/save-subscription',
    route(saveSubscriptionEndpoint, async ({ body, user }) => {
      await saveSubscription(user.userId, body.data);
      return { success: true as const };
    }),
  );

  app.delete(
    '/user/me',
    route(deleteAccountEndpoint, async ({ user }) => {
      await revokeAllRefreshTokens(user.userId);
      await revokeAllAuthCodes(user.userId);
      await deleteUser(user.userId);
      return { message: 'Account deleted successfully' as const };
    }),
  );

  app.get(
    '/quote',
    route(quoteEndpoint, async ({ query }) => {
      return await pythonClient.getQuote(query.ticker);
    }),
  );

  app.get(
    '/data',
    route(dataEndpoint, async ({ query }) => {
      return await pythonClient.getOhlcvData(query.ticker, query.period, query.interval);
    }),
  );

  app.get(
    '/search',
    route(searchEndpoint, async ({ query }) => {
      return await pythonClient.searchTickers(query.query);
    }),
  );

  app.get(
    '/data/indicator',
    route(indicatorEndpoint, async ({ query }) => {
      return await pythonClient.getIndicatorData({
        ticker: query.ticker,
        indicator: query.indicator,
        interval: query.interval,
        period: query.period,
        timeperiod: query.timeperiod ? Number(query.timeperiod) : undefined,
        matype: query.matype ? Boolean(query.matype) : undefined,
        stdUp: query.stdUp ? Number(query.stdUp) : undefined,
        stdDown: query.stdDown ? Number(query.stdDown) : undefined,
        fastk_period: query.fastPeriod ? Number(query.fastPeriod) : 5,
        slowk_period: query.slowkPeriod ? Number(query.slowkPeriod) : 3,
        slowk_matype: query.slowkMatype ? Number(query.slowkMatype) : 0,
        slowd_period: query.slowdPeriod ? Number(query.slowdPeriod) : 3,
        slowd_matype: query.slowdMatype ? Number(query.slowdMatype) : 0,
      });
    }),
  );

  app.get(
    '/portfolio',
    route(portfolioEndpoint, async ({ user }) => {
      const result = await portfolio(user.userId);
      return {
        count: result.count,
        positions: result.positions.map((p) => ({
          _id: p._id.toString(),
          userId: p.userId.toString(),
          symbol: p.symbol,
          shares: p.shares,
          avgPrice: p.avgPrice,
          positionType: p.positionType ?? 'long',
          lastUpdated: p.lastUpdated.toISOString(),
        })),
      };
    }),
  );

  app.get(
    '/user-watchlist',
    route(userWatchlistEndpoint, async ({ user }) => {
      const watchlist = await GetUserWatchlist(user.userId);
      if (!watchlist) return [];
      return watchlist.map((w) => ({
        _id: w._id.toString(),
        userId: w.userId.toString(),
        symbols: w.symbols,
      }));
    }),
  );

  app.get(
    '/trade-history',
    route(tradeHistoryEndpoint, async ({ user }) => {
      const tradeHistory = await GetTradeHistory(user.userId);
      if (!tradeHistory) return [];
      return tradeHistory
        .map((t) => ({
          _id: t._id.toString(),
          userId: t.userId.toString(),
          symbol: t.symbol,
          shares: t.shares,
          price: t.price,
          type: t.type,
          timestamp: t.timestamp.toISOString(),
          realizedPL: t.realizedPL,
          orderId: t.orderId,
          wasStopLoss: t.wasStopLoss,
        }))
        .reverse();
    }),
  );

  app.post(
    '/user-watchlist/add',
    route(addToWatchlistEndpoint, async ({ body, user }) => {
      const success = await AddToWatchlist(user.userId, body.symbol);
      return { success };
    }),
  );

  app.delete(
    '/user-watchlist/delete',
    route(deleteFromWatchlistEndpoint, async ({ body, user }) => {
      const success = await RemoveFromWatchlist(user.userId, body.symbol);
      return { success };
    }),
  );

  app.post(
    '/stopLoss',
    route(stopLossEndpoint, async ({ body, user }) => {
      const stopLossInfo = {
        symbol: body.symbol,
        price: Number(body.price),
        startDate: body.startDate,
        qty: Number(body.qty),
        type: body.type,
        userId: user.userId,
      };
      const stopLossObj = new StopLoss(stopLossInfo);
      await stopLossObj.save();
      return { message: 'Stop loss order placed.' as const };
    }),
  );

  app.get(
    '/stopLoss',
    route(getStopLossEndpoint, async ({ user }) => {
      const stopLosses = await getUserStopLosses(user.userId);
      return stopLosses.map((sl) => ({
        _id: sl._id.toString(),
        userId: sl.userId.toString(),
        symbol: sl.symbol,
        price: sl.price,
        startDate: sl.startDate.toISOString(),
        type: sl.type,
        qty: sl.qty,
      }));
    }),
  );

  app.delete(
    '/stopLoss/:id',
    route(deleteStopLossEndpoint, async ({ params, user }) => {
      const { id } = params;
      const deleted = await deleteStopLoss(id, user.userId);
      if (!deleted) {
        throw new Error('Stop loss not found');
      }
      return { message: 'Stop loss cancelled' as const };
    }),
  );

  app.post(
    '/buy',
    route(buyEndpoint, async ({ body, user }) => {
      const positionDetails = {
        symbol: body.symbol,
        qty: Number(body.qty),
        side: body.side,
        price: 0,
        orderId: `test-order-${crypto.randomUUID()}`,
      };
      const quote = await pythonClient.getQuote(positionDetails.symbol);
      if (!quote || !quote.currentPrice) {
        throw new Error(`Failed to fetch current price for ${positionDetails.symbol}`);
      }
      positionDetails.price = quote.currentPrice;
      const result = await executeTrade(positionDetails, user.userId);
      if (result.duplicate) {
        return { success: true, duplicate: true, message: 'Duplicate order ignored' };
      }
      return {
        success: true,
        message: 'Buy order executed successfully',
        trade: result.newTrade
          ? {
              _id: result.newTrade._id.toString(),
              userId: result.newTrade.userId.toString(),
              symbol: result.newTrade.symbol,
              shares: result.newTrade.shares,
              price: result.newTrade.price,
              type: result.newTrade.type,
              timestamp: result.newTrade.timestamp.toISOString(),
              realizedPL: result.newTrade.realizedPL,
              orderId: result.newTrade.orderId,
              wasStopLoss: result.newTrade.wasStopLoss,
            }
          : undefined,
      };
    }),
  );

  app.post(
    '/sell',
    route(sellEndpoint, async ({ body, user }) => {
      const positionDetails = {
        symbol: body.symbol,
        qty: Number(body.qty),
        side: body.side,
        price: 0,
        orderId: `test-order-${crypto.randomUUID()}`,
      };
      const quote = await pythonClient.getQuote(positionDetails.symbol);
      if (!quote || !quote.currentPrice) {
        throw new Error(`Failed to fetch current price for ${positionDetails.symbol}`);
      }
      positionDetails.price = quote.currentPrice;
      const result = await executeTrade(positionDetails, user.userId);
      return {
        success: true,
        message: 'Sell order executed successfully',
        trade: result.newTrade
          ? {
              _id: result.newTrade._id.toString(),
              userId: result.newTrade.userId.toString(),
              symbol: result.newTrade.symbol,
              shares: result.newTrade.shares,
              price: result.newTrade.price,
              type: result.newTrade.type,
              timestamp: result.newTrade.timestamp.toISOString(),
              realizedPL: result.newTrade.realizedPL,
              orderId: result.newTrade.orderId,
              wasStopLoss: result.newTrade.wasStopLoss,
            }
          : undefined,
      };
    }),
  );

  app.use(
    (err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
      let statusCode = 500;
      let message = 'server Error';
      if (err instanceof UnauthorizedError || err.statusCode) {
        statusCode = err.statusCode ?? 500;
        message = err.message;
      } else {
        message = err.message || 'server Error';
      }
      res.status(statusCode).json({ message });
    },
  );

  return app;
}

export function createTestApp(): TestApp {
  const app = buildApp();
  return {
    app,
    createToken: (payload) => {
      return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
    },
  };
}

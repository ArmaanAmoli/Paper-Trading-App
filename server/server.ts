import express from 'express';
import mongoose from 'mongoose';
import process from 'node:process';
import 'dotenv/config';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { getQuote } from './GetData/getQuote.js';
import { v4 as uuidv4 } from 'uuid';
import { allStopLossPromise } from './StopLoss/getAllStopLoss.js';
import { socket, stopLossWS } from './StopLoss/stoploss.js';
import { StopLoss } from './Schemas/mongoSchema.js';
import { getEnv } from './lib/env.js';
import { route } from './lib/route.js';
import { SignUp, login, portfolio, executeTrade, GetUserData, GetTradeHistory, GetUserWatchlist, AddToWatchlist, RemoveFromWatchlist, saveSubscription, getUserStopLosses, deleteStopLoss } from './queryManager.js';
import {
  signUpEndpoint,
  loginEndpoint,
  userDataEndpoint,
  saveSubscriptionEndpoint,
} from '@shared/contract/auth.js';
import {
  buyEndpoint,
  sellEndpoint,
  portfolioEndpoint,
  tradeHistoryEndpoint,
  stopLossEndpoint,
  getStopLossEndpoint,
  deleteStopLossEndpoint,
} from '@shared/contract/trade.js';
import {
  userWatchlistEndpoint,
  addToWatchlistEndpoint,
  deleteFromWatchlistEndpoint,
} from '@shared/contract/watchlist.js';
import {
  quoteEndpoint,
  dataEndpoint,
  searchEndpoint,
  indicatorEndpoint,
} from '@shared/contract/market.js';

const env = getEnv();
const FAST_API_SERVER_DOMAIN = env.FAST_API_SERVER_DOMAIN;
const server = express();
const port = env.PORT;

try {
  await mongoose.connect(env.MONGO_URL);
  console.log('MongoDB connected');
} catch (err) {
  console.error('MongoDB FAILED', err);
  process.exit(1);
}

// Initialize stop loss map from database
let stopLossMap = new Map<string, any[]>();
allStopLossPromise
  .then(({ tickerToSL: tickerToSLMap }) => {
    stopLossMap = tickerToSLMap;
    console.log('Stop loss map initialized from database');
  })
  .catch((err) => {
    console.error('Failed to initialize stop loss map:', err);
  });

// MIDDLEWARES
server.use(express.json());
server.use(cors());

// Request Handlers using route() wrapper
//-----------------------------------------------------------------------ACCOUNT-------------------------------------------------------------------------------------------
server.post('/sign-up', route(signUpEndpoint, async ({ body }) => {
  await SignUp(body);
  return { message: 'User Registered' as const };
}));
server.post('/login', route(loginEndpoint, async ({ body }) => {
  const user = await login(body);
  if (!user) {
    throw new Error('Incorrect Password');
  }
  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );
  return { message: 'Login Success' as const, token };
}));
server.get('/user-data', route(userDataEndpoint, async ({ user }) => {
  const userData = await GetUserData(user.userId);
  if (!userData) throw new Error('User not found');
  const ns = userData.notificationSubscription;
  return {
    _id: userData._id.toString(),
    username: userData.username,
    email: userData.email,
    balance: userData.balance,
    blockedMargin: userData.blockedMargin,
    createdAt: userData.createdAt.toISOString(),
    lastLogin: userData.lastLogin ? userData.lastLogin.toISOString() : null,
    notificationSubscription: ns ? {
      endpoint: ns.endpoint,
      expirationTime: ns.expirationTime ?? null,
      keys: ns.keys ? {
        p256dh: ns.keys.p256dh,
        auth: ns.keys.auth,
      } : { p256dh: '', auth: '' },
    } : null,
  };
}));
server.post('/save-subscription', route(saveSubscriptionEndpoint, async ({ body, user }) => {
  await saveSubscription(user.userId, body.data);
  return { success: true as const };
}));

//-------------------------------------------------------------------STOCK-DATA-------------------------------------------------------------------------------------------
server.get('/quote', route(quoteEndpoint, async ({ query }) => {
  const ticker = query.ticker;
  const fastAPIRes = await axios.get(FAST_API_SERVER_DOMAIN + '/quote', {
    params: { ticker },
  });
  return fastAPIRes.data;
}));
server.get('/data', route(dataEndpoint, async ({ query }) => {
  const ticker = query.ticker;
  const interval = query.interval;
  const period = query.period;
  const fastAPIRes = await axios.get(FAST_API_SERVER_DOMAIN + '/data', {
    params: { ticker, period, interval },
  });
  return fastAPIRes.data;
}));
server.get('/portfolio', route(portfolioEndpoint, async ({ user }) => {
  const result = await portfolio(user.userId);
  return {
    count: result.count,
    positions: result.positions.map(p => ({
      _id: p._id.toString(),
      userId: p.userId.toString(),
      symbol: p.symbol,
      shares: p.shares,
      avgPrice: p.avgPrice,
      positionType: p.positionType ?? 'long',
      lastUpdated: p.lastUpdated.toISOString(),
    })),
  };
}));
server.get('/user-watchlist', route(userWatchlistEndpoint, async ({ user }) => {
  const watchlist = await GetUserWatchlist(user.userId);
  if (!watchlist) return [];
  return watchlist.map(w => ({
    _id: w._id.toString(),
    userId: w.userId.toString(),
    symbols: w.symbols,
  }));
}));
server.get('/trade-history', route(tradeHistoryEndpoint, async ({ user }) => {
  const tradeHistory = await GetTradeHistory(user.userId);
  if (!tradeHistory) return [];
  return tradeHistory.map(t => ({
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
  })).reverse();
}));
server.get('/search', route(searchEndpoint, async ({ query }) => {
  const fastAPIRes = await axios.get(FAST_API_SERVER_DOMAIN + '/search', {
    params: { query: query.query },
  });
  return fastAPIRes.data;
}));
server.post('/user-watchlist/add', route(addToWatchlistEndpoint, async ({ body, user }) => {
  const success = await AddToWatchlist(user.userId, body.symbol);
  return { success };
}));
server.delete('/user-watchlist/delete', route(deleteFromWatchlistEndpoint, async ({ body, user }) => {
  const success = await RemoveFromWatchlist(user.userId, body.symbol);
  return { success };
}));
server.get('/data/indicator', route(indicatorEndpoint, async ({ query }) => {
  return await getIndicatorDataFromPythonClient(query);
}));

//-----------------------------------------------------------------------TRADE-------------------------------------------------------------------------------------------
server.post('/buy', route(buyEndpoint, async ({ body, user }) => {
  const positionDetails = {
    symbol: body.symbol,
    qty: body.qty,
    side: body.side,
    price: 0, // will be set below
    orderId: uuidv4(),
  };
  if (!positionDetails.symbol || !positionDetails.qty || !positionDetails.side) {
    throw new Error('Missing required fields: symbol, qty, side');
  }
  const quote = await getQuote(positionDetails.symbol);
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
    trade: result.newTrade ? {
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
    } : undefined,
  };
}));
server.post('/sell', route(sellEndpoint, async ({ body, user }) => {
  const positionDetails = {
    symbol: body.symbol,
    qty: body.qty,
    side: body.side,
    price: 0, // will be set below
    orderId: uuidv4(),
  };
  if (!positionDetails.symbol || !positionDetails.qty || !positionDetails.side) {
    throw new Error('Missing required fields: symbol, qty, side');
  }
  const quote = await getQuote(positionDetails.symbol);
  if (!quote || !quote.currentPrice) {
    throw new Error(`Failed to fetch current price for ${positionDetails.symbol}`);
  }
  positionDetails.price = quote.currentPrice;
  const result = await executeTrade(positionDetails, user.userId);
  return {
    success: true,
    message: 'Sell order executed successfully',
    trade: result.newTrade ? {
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
    } : undefined,
  };
}));
server.post('/stopLoss', route(stopLossEndpoint, async ({ body, user }) => {
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
  
  // Update in-memory map and subscribe to WebSocket if needed
  const ticker = stopLossObj.symbol;
  if (!stopLossMap.has(ticker)) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'subscribe', ticker }));
    }
    stopLossMap.set(ticker, []);
  }
  const value = stopLossMap.get(ticker);
  if (value) {
    value.push(stopLossObj.toJSON());
  }
  
  return { message: 'Stop loss order placed.' as const };
}));
server.get('/stopLoss', route(getStopLossEndpoint, async ({ user }) => {
  const stopLosses = await getUserStopLosses(user.userId);
  return stopLosses.map(sl => ({
    _id: sl._id.toString(),
    userId: sl.userId.toString(),
    symbol: sl.symbol,
    price: sl.price,
    startDate: sl.startDate.toISOString(),
    type: sl.type,
    qty: sl.qty,
  }));
}));
server.delete('/stopLoss/:id', route(deleteStopLossEndpoint, async ({ params, user }) => {
  const { id } = params as { id: string };
  const deleted = await deleteStopLoss(id, user.userId);
  if (!deleted) {
    throw new Error('Stop loss not found');
  }
  
  // Update in-memory map and unsubscribe if needed
  const ticker = deleted.symbol;
  if (stopLossMap.has(ticker)) {
    const arr = stopLossMap.get(ticker);
    if (arr) {
      const filtered = arr.filter((sl) => sl._id.toString() !== id);
      if (filtered.length === 0) {
        stopLossMap.delete(ticker);
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'unsubscribe', ticker }));
        }
      } else {
        stopLossMap.set(ticker, filtered);
      }
    }
  }
  
  return { message: 'Stop loss cancelled' as const };
}));

// Global Error Handler Middleware
server.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`Error Stack: ${err.stack}`);
  const statusCode = (err as any).statusCode || (err as any).status || 500;
  res.status(statusCode).json({ message: err.message || 'server Error' });
});

const httpServer = server.listen(port, async () => {
  await stopLossWS();
  console.log(`Server running on port ${port}`);

  process.on('SIGTERM', () => {
    console.log('Stop Loss Web Socket connection closed.');
    if (socket?.readyState === WebSocket.OPEN) {
      socket.close();
    }
    httpServer.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });
  });
});

// Helper function for indicator endpoint
async function getIndicatorDataFromPythonClient(query: any) {
  const { pythonClient } = await import('./lib/pythonClient.js');
  return await pythonClient.getIndicatorData({
    ticker: query.ticker,
    indicator: query.indicator,
    interval: query.interval,
    period: query.period,
    timeperiod: query.timeperiod ? Number(query.timeperiod) : undefined,
    matype: query.matype ? Boolean(query.matype) : undefined,
    stdUp: query.stdUp ? Number(query.stdUp) : undefined,
    stdDown: query.stdDown ? Number(query.stdDown) : undefined,
    fastPeriod: query.fastPeriod ? Number(query.fastPeriod) : 5,
    slowkPeriod: query.slowkPeriod ? Number(query.slowkPeriod) : 3,
    slowkMatype: query.slowkMatype ? Number(query.slowkMatype) : 0,
    slowdPeriod: query.slowdPeriod ? Number(query.slowdPeriod) : 3,
    slowdMatype: query.slowdMatype ? Number(query.slowdMatype) : 0,
  });
}

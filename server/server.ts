import express from 'express';
import mongoose from 'mongoose';
import process from 'node:process';
import 'dotenv/config';
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
} from './queryManager.js';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import axios from 'axios';
import { getQuote } from './GetData/getQuote.js';
import { v4 as uuidv4 } from 'uuid';
import { allStopLossPromise, tickerToSL } from './StopLoss/getAllStopLoss.js';
import { socket, stopLossWS } from './StopLoss/stoploss.js';
import { StopLoss } from './Schemas/mongoSchema.js';
import { getEnv } from './lib/env.js';
import { verifyToken } from './lib/auth.js';
import { route } from './lib/route.js';
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
  userDataEndpoint,
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
server.post('/sign-up', route(signUpEndpoint, SignUp));
server.post('/login', route(loginEndpoint, login));
server.get('/user-data', route(userDataEndpoint, GetUserData));
server.post('/save-subscription', route(saveSubscriptionEndpoint, saveSubscription));

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
  return await portfolio(user.userId);
}));
server.get('/user-watchlist', route(userWatchlistEndpoint, async ({ user }) => {
  return await GetUserWatchlist(user.userId);
}));
server.get('/trade-history', route(tradeHistoryEndpoint, async ({ user }) => {
  const tradeHistory = await GetTradeHistory(user.userId);
  return tradeHistory.reverse();
}));
server.get('/search', route(searchEndpoint, async ({ query }) => {
  const fastAPIRes = await axios.get(FAST_API_SERVER_DOMAIN + '/search', {
    params: { query: query.query },
  });
  return fastAPIRes.data;
}));
server.post('/user-watchlist/add', route(addToWatchlistEndpoint, async ({ body, user }) => {
  return await AddToWatchlist(user.userId, body.symbol);
}));
server.delete('/user-watchlist/delete', route(deleteFromWatchlistEndpoint, async ({ body, user }) => {
  return await RemoveFromWatchlist(user.userId, body.symbol);
}));
server.get('/data/indicator', route(indicatorEndpoint, async ({ query }) => {
  return await getIndicatorDataFromPythonClient(query);
}));

//-----------------------------------------------------------------------TRADE-------------------------------------------------------------------------------------------
server.post('/buy', route(buyEndpoint, async ({ body, user }) => {
  const positionDetails = body;
  if (!positionDetails.symbol || !positionDetails.qty || !positionDetails.side) {
    throw new Error('Missing required fields: symbol, qty, side');
  }
  const quote = await getQuote(positionDetails.symbol);
  if (!quote || !quote.currentPrice) {
    throw new Error(`Failed to fetch current price for ${positionDetails.symbol}`);
  }
  positionDetails.price = quote.currentPrice;
  positionDetails.orderId = uuidv4();
  return await executeTrade(positionDetails, user.userId);
}));
server.post('/sell', route(sellEndpoint, async ({ body, user }) => {
  const positionDetails = body;
  if (!positionDetails.symbol || !positionDetails.qty || !positionDetails.side) {
    throw new Error('Missing required fields: symbol, qty, side');
  }
  const quote = await getQuote(positionDetails.symbol);
  if (!quote || !quote.currentPrice) {
    throw new Error(`Failed to fetch current price for ${positionDetails.symbol}`);
  }
  positionDetails.price = quote.currentPrice;
  positionDetails.orderId = uuidv4();
  return await executeTrade(positionDetails, user.userId);
}));
server.post('/stopLoss', route(stopLossEndpoint, async ({ body, user }) => {
  const stopLossInfo = body;
  stopLossInfo.userId = user.userId;
  const stopLossObj = new StopLoss(stopLossInfo);
  await stopLossObj.save();
  
  // Update in-memory map and subscribe to WebSocket if needed
  const ticker = stopLossObj.symbol;
  if (!stopLossMap.has(ticker)) {\n    if (socket?.readyState === WebSocket.OPEN) {\n      socket.send(JSON.stringify({ action: 'subscribe', ticker }));\n    }\n    stopLossMap.set(ticker, []);\n  }\n  const value = stopLossMap.get(ticker);\n  if (value) {\n    value.push(stopLossObj.toJSON());\n  }\n  
  return { message: 'Stop loss order placed.' };
}));
server.get('/stopLoss', route(getStopLossEndpoint, async ({ user }) => {
  return await getUserStopLosses(user.userId);
}));
server.delete('/stopLoss/:id', route(deleteStopLossEndpoint, async ({ params, user }) => {
  const deleted = await deleteStopLoss(params.id, user.userId);
  if (!deleted) {
    throw new Error('Stop loss not found');
  }
  
  // Update in-memory map and unsubscribe if needed
  const ticker = deleted.symbol;
  if (stopLossMap.has(ticker)) {
    const arr = stopLossMap.get(ticker);
    if (arr) {
      const filtered = arr.filter((sl) => sl._id.toString() !== params.id);
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
  
  return { message: 'Stop loss cancelled' };
}));

// Global Error Handler Middleware
server.use((err, _req, res, _next) => {
  console.error(`Error Stack: ${err.stack}`);
  const statusCode = err.statusCode || err.status || 500;
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

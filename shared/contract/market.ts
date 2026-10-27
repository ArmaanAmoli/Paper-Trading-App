import { z } from 'zod';
import { defineEndpoint } from './define.js';

// Quote (protected)
export const quoteEndpoint = defineEndpoint({
  method: 'GET',
  path: '/quote',
  auth: true,
  query: z.object({
    ticker: z.string().min(1),
  }),
  response: z.object({
    ticker: z.string(),
    currentPrice: z.number(),
    change: z.number(),
    percentChange: z.number(),
  }),
});

export type QuoteQuery = z.infer<typeof quoteEndpoint.query>;
export type QuoteResponse = z.infer<typeof quoteEndpoint.response>;

// OHLCV Data (protected)
export const dataEndpoint = defineEndpoint({
  method: 'GET',
  path: '/data',
  auth: true,
  query: z.object({
    ticker: z.string().min(1),
    period: z.string(),
    interval: z.string(),
  }),
  response: z.array(
    z.object({
      Date: z.string(),
      Open: z.number(),
      High: z.number(),
      Low: z.number(),
      Close: z.number(),
      Volume: z.number(),
    }),
  ),
});

export type DataQuery = z.infer<typeof dataEndpoint.query>;
export type DataResponse = z.infer<typeof dataEndpoint.response>;

// Search (protected)
export const searchEndpoint = defineEndpoint({
  method: 'GET',
  path: '/search',
  auth: true,
  query: z.object({
    query: z.string().min(1),
  }),
  response: z.array(
    z
      .object({
        symbol: z.string(),
        shortname: z.string().optional(),
        typeDisp: z.string().optional(),
        exchange: z.string().optional(),
      })
      .passthrough(),
  ), // yfinance search results vary
});

export type SearchQuery = z.infer<typeof searchEndpoint.query>;
export type SearchResponse = z.infer<typeof searchEndpoint.response>;

// Indicators (protected)
const indicatorBaseQuery = z.object({
  ticker: z.string().min(1),
  indicator: z.enum(['SMA', 'EMA', 'RSI', 'VOL', 'OBV', 'BBAND', 'STOCH']),
  interval: z.string(),
  period: z.string(),
  timeperiod: z.coerce.number().optional(),
  matype: z.coerce.boolean().optional(),
  stdUp: z.coerce.number().optional(),
  stdDown: z.coerce.number().optional(),
  fastPeriod: z.coerce.number().optional(),
  slowkPeriod: z.coerce.number().optional(),
  slowkMatype: z.coerce.number().optional(),
  slowdPeriod: z.coerce.number().optional(),
  slowdMatype: z.coerce.number().optional(),
});

export const indicatorEndpoint = defineEndpoint({
  method: 'GET',
  path: '/data/indicator',
  auth: true,
  query: indicatorBaseQuery,
  response: z.record(z.string(), z.unknown()), // Varies by indicator
});

export type IndicatorQuery = z.infer<typeof indicatorEndpoint.query>;
export type IndicatorResponse = z.infer<typeof indicatorEndpoint.response>;

// Stop Loss (protected)
export const stopLossMarketEndpoint = defineEndpoint({
  method: 'GET',
  path: '/stopLoss',
  auth: true,
  query: z.object({ symbol: z.string().optional() }).optional(),
  response: z.array(
    z.object({
      _id: z.string(),
      userId: z.string(),
      symbol: z.string(),
      price: z.number(),
      startDate: z.string(),
      type: z.enum(['buy', 'sell']),
      qty: z.number(),
    }),
  ),
});

export type StopLossQuery = z.infer<typeof stopLossMarketEndpoint.query>;
export type StopLossResponse = z.infer<typeof stopLossMarketEndpoint.response>;

// Portfolio (protected)
export const portfolioMarketEndpoint = defineEndpoint({
  method: 'GET',
  path: '/portfolio',
  auth: true,
  response: z.object({
    count: z.number(),
    positions: z.array(
      z.object({
        _id: z.string(),
        userId: z.string(),
        symbol: z.string(),
        shares: z.number(),
        avgPrice: z.number(),
        positionType: z.enum(['long', 'short']),
        lastUpdated: z.string(),
      }),
    ),
  }),
});

export type PortfolioResponse = z.infer<typeof portfolioMarketEndpoint.response>;

// Trade History (protected)
export const tradeHistoryMarketEndpoint = defineEndpoint({
  method: 'GET',
  path: '/trade-history',
  auth: true,
  response: z.array(
    z.object({
      _id: z.string(),
      userId: z.string(),
      symbol: z.string(),
      shares: z.number(),
      price: z.number(),
      type: z.enum(['buy', 'sell']),
      timestamp: z.string(),
      realizedPL: z.number(),
      orderId: z.string(),
      wasStopLoss: z.boolean(),
    }),
  ),
});

export type TradeHistoryResponse = z.infer<typeof tradeHistoryMarketEndpoint.response>;

// User Data (protected)
export const userDataEndpoint = defineEndpoint({
  method: 'GET',
  path: '/user-data',
  auth: true,
  response: z.object({
    _id: z.string(),
    username: z.string(),
    email: z.string(),
    balance: z.number(),
    blockedMargin: z.number(),
    createdAt: z.string(),
    lastLogin: z.string().nullable(),
    notificationSubscription: z
      .object({
        endpoint: z.string(),
        expirationTime: z.number().nullable(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
      })
      .nullable(),
  }),
});

export type UserDataResponse = z.infer<typeof userDataEndpoint.response>;

// Watchlist item (single document)
export const watchlistItemSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  symbols: z.array(z.string()),
});

export type WatchlistItem = z.infer<typeof watchlistItemSchema>;

// Watchlist (protected) - returns array of watchlist items (typically one per user)
export const watchlistEndpoint = defineEndpoint({
  method: 'GET',
  path: '/user-watchlist',
  auth: true,
  response: z.array(watchlistItemSchema),
});

export type WatchlistResponse = z.infer<typeof watchlistEndpoint.response>;

// Re-export the item type (already exported above)

export const addToWatchlistEndpoint = defineEndpoint({
  method: 'POST',
  path: '/user-watchlist/add',
  auth: true,
  body: z.object({ symbol: z.string().min(1) }),
  response: z.object({ success: z.boolean() }),
});

export type AddToWatchlistResponse = z.infer<typeof addToWatchlistEndpoint.response>;

export const deleteFromWatchlistEndpoint = defineEndpoint({
  method: 'DELETE',
  path: '/user-watchlist/delete',
  auth: true,
  body: z.object({ symbol: z.string().min(1) }),
  response: z.object({ success: z.boolean() }),
});

export type DeleteFromWatchlistResponse = z.infer<typeof deleteFromWatchlistEndpoint.response>;

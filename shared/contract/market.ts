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
  response: z.array(z.unknown()), // yfinance search results vary
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
  response: z.unknown(), // Varies by indicator
});

export type IndicatorQuery = z.infer<typeof indicatorEndpoint.query>;
export type IndicatorResponse = z.infer<typeof indicatorEndpoint.response>;

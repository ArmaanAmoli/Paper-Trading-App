import { z } from 'zod';

// Client -> FastAPI WebSocket messages

// Quote WebSocket
const quoteSubscribeSchema = z.object({
  action: z.literal('subscribe'),
  ticker: z.string().min(1, 'ticker is required'),
});

const quoteUnsubscribeSchema = z.object({
  action: z.literal('unsubscribe'),
  ticker: z.string().min(1, 'ticker is required'),
});

export const quoteClientMessageSchema = z.union([quoteSubscribeSchema, quoteUnsubscribeSchema]);

export type QuoteClientMessage = z.infer<typeof quoteClientMessageSchema>;

// Quote server message (FastAPI -> Client)
export const quoteServerMessageSchema = z
  .object({
    ticker: z.string(),
    currentPrice: z.number(),
    change: z.number(),
    percentChange: z.number(),
    // Additional fields may be present
  })
  .passthrough();

export type QuoteServerMessage = z.infer<typeof quoteServerMessageSchema>;

// Indicator WebSocket
const indicatorSubscribeSchema = z.object({
  action: z.literal('subscribe'),
  ticker: z.string().min(1, 'ticker is required'),
  interval: z.string(),
  indicator: z.enum(['SMA', 'EMA', 'RSI', 'VOL', 'OBV', 'BBAND', 'STOCH']),
  properties: z.record(z.string(), z.unknown()), // indicator-specific properties
});

const indicatorUnsubscribeSchema = z.object({
  action: z.literal('unsubscribe'),
  ticker: z.string().min(1, 'ticker is required'),
  interval: z.string(),
  indicator: z.enum(['SMA', 'EMA', 'RSI', 'VOL', 'OBV', 'BBAND', 'STOCH']),
  properties: z.record(z.string(), z.unknown()),
});

export const indicatorClientMessageSchema = z.union([
  indicatorSubscribeSchema,
  indicatorUnsubscribeSchema,
]);

export type IndicatorClientMessage = z.infer<typeof indicatorClientMessageSchema>;

// Indicator server message (FastAPI -> Client)
export const indicatorServerMessageSchema = z
  .object({
    indicator_id: z.string(),
    ticker: z.string(),
    interval: z.string(),
    indicator: z.string(),
    properties: z.record(z.string(), z.unknown()),
    timestamp: z.string(),
    // Indicator-specific value fields (value, UP/MIDDLE/DOWN, SLOWK/SLOWD, etc.)
  })
  .passthrough();

export type IndicatorServerMessage = z.infer<typeof indicatorServerMessageSchema>;

// Express -> FastAPI WebSocket (for stop loss)
// Uses JWT_TOKEN_05_2036 as subprotocol
export const expressQuoteSubscribeSchema = z.object({
  action: z.literal('subscribe'),
  ticker: z.string().min(1, 'ticker is required'),
});

export const expressQuoteUnsubscribeSchema = z.object({
  action: z.literal('unsubscribe'),
  ticker: z.string().min(1, 'ticker is required'),
});

export const expressQuoteClientMessageSchema = z.union([
  expressQuoteSubscribeSchema,
  expressQuoteUnsubscribeSchema,
]);

export type ExpressQuoteClientMessage = z.infer<typeof expressQuoteClientMessageSchema>;

// Express receives quote messages from FastAPI (same shape as client quote messages)
export type ExpressQuoteServerMessage = QuoteServerMessage;

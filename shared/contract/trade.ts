import { z } from 'zod';
import { defineEndpoint } from './define.js';

// Common schemas
const tradeCommonSchema = z.object({
  symbol: z.string().min(1),
  qty: z.coerce.number().positive(),
  side: z.enum(['buy', 'sell']),
});

const tradeResponseSchema = z.object({
  success: z.boolean(),
  duplicate: z.boolean().optional(),
  trade: z
    .object({
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
    })
    .optional(),
  message: z.string(),
});

// Buy
const buyBodySchema = tradeCommonSchema;

export const buyEndpoint = defineEndpoint({
  method: 'POST',
  path: '/buy',
  auth: true,
  body: buyBodySchema,
  response: tradeResponseSchema,
});

export type BuyBody = z.infer<typeof buyBodySchema>;
export type BuyResponse = z.infer<typeof buyEndpoint.response>;

// Sell
const sellBodySchema = tradeCommonSchema;

export const sellEndpoint = defineEndpoint({
  method: 'POST',
  path: '/sell',
  auth: true,
  body: sellBodySchema,
  response: tradeResponseSchema,
});

export type SellBody = z.infer<typeof sellBodySchema>;
export type SellResponse = z.infer<typeof sellEndpoint.response>;

// Stop Loss (protected)
const stopLossBodySchema = z.object({
  symbol: z.string().min(1),
  price: z.coerce.number().positive(),
  startDate: z.string(), // ISO date string
  qty: z.coerce.number().positive(),
  type: z.enum(['buy', 'sell']),
});

export const stopLossEndpoint = defineEndpoint({
  method: 'POST',
  path: '/stopLoss',
  auth: true,
  body: stopLossBodySchema,
  response: z.object({
    message: z.literal('Stop loss order placed.'),
  }),
});

export type StopLossBody = z.infer<typeof stopLossBodySchema>;
export type StopLossResponse = z.infer<typeof stopLossEndpoint.response>;

// Get Stop Losses (protected)
export const getStopLossEndpoint = defineEndpoint({
  method: 'GET',
  path: '/stopLoss',
  auth: true,
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

export type GetStopLossResponse = z.infer<typeof getStopLossEndpoint.response>;

// Delete Stop Loss (protected)
export const deleteStopLossEndpoint = defineEndpoint({
  method: 'DELETE',
  path: '/stopLoss/:id',
  auth: true,
  response: z.object({
    message: z.literal('Stop loss cancelled'),
  }),
});

export type DeleteStopLossResponse = z.infer<typeof deleteStopLossEndpoint.response>;

// Trade History (protected)
export const tradeHistoryEndpoint = defineEndpoint({
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

export type TradeHistoryResponse = z.infer<typeof tradeHistoryEndpoint.response>;

// Portfolio (protected)
export const portfolioEndpoint = defineEndpoint({
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

export type PortfolioResponse = z.infer<typeof portfolioEndpoint.response>;

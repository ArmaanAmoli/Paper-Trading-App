import { z } from 'zod';

// WebSocket message schemas
const _quoteMessageSchema = z.object({
  ticker: z.string(),
  currentPrice: z.number(),
  change: z.number(),
  percentChange: z.number(),
});

export type QuoteMessage = z.infer<typeof _quoteMessageSchema>;

const _indicatorMessageSchema = z.object({
  indicator: z.string(),
  interval: z.string(),
  ticker: z.string(),
  indicator_id: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export type IndicatorMessage = z.infer<typeof _indicatorMessageSchema>;

export type WebSocketMessage = QuoteMessage | IndicatorMessage;

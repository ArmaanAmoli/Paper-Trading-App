import { z } from 'zod';
import { defineEndpoint } from './define.js';

// User Watchlist (protected)
export const userWatchlistEndpoint = defineEndpoint({
  method: 'GET',
  path: '/user-watchlist',
  auth: true,
  response: z.array(
    z.object({
      _id: z.string(),
      userId: z.string(),
      symbols: z.array(z.string()),
    }),
  ),
});

export type UserWatchlistResponse = z.infer<typeof userWatchlistEndpoint.response>;

// Add to Watchlist (protected)
const addToWatchlistBodySchema = z.object({
  symbol: z.string().min(1),
});

export const addToWatchlistEndpoint = defineEndpoint({
  method: 'POST',
  path: '/user-watchlist/add',
  auth: true,
  body: addToWatchlistBodySchema,
  response: z.object({
    success: z.boolean(),
  }),
});

export type AddToWatchlistBody = z.infer<typeof addToWatchlistBodySchema>;
export type AddToWatchlistResponse = z.infer<typeof addToWatchlistEndpoint.response>;

// Delete from Watchlist (protected)
const deleteFromWatchlistBodySchema = z.object({
  symbol: z.string().min(1),
});

export const deleteFromWatchlistEndpoint = defineEndpoint({
  method: 'DELETE',
  path: '/user-watchlist/delete',
  auth: true,
  body: deleteFromWatchlistBodySchema,
  response: z.object({
    success: z.boolean(),
  }),
});

export type DeleteFromWatchlistBody = z.infer<typeof deleteFromWatchlistBodySchema>;
export type DeleteFromWatchlistResponse = z.infer<typeof deleteFromWatchlistEndpoint.response>;

import { z } from 'zod';
import { defineEndpoint } from './define.js';

// Save subscription (protected) - also in auth.ts, keeping for domain separation
const subscriptionSchema = z.object({
  endpoint: z.string(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export const saveSubscriptionEndpoint = defineEndpoint({
  method: 'POST',
  path: '/save-subscription',
  auth: true,
  body: z.object({
    data: subscriptionSchema,
  }),
  response: z.object({
    success: z.literal(true),
  }),
});

export type SaveSubscriptionBody = z.infer<typeof saveSubscriptionEndpoint.body>;
export type SaveSubscriptionResponse = z.infer<typeof saveSubscriptionEndpoint.response>;

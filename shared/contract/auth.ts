import { z } from 'zod';
import { defineEndpoint } from './define.js';

// Sign up
const signUpBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30),
});

export const signUpEndpoint = defineEndpoint({
  method: 'POST',
  path: '/sign-up',
  auth: false,
  body: signUpBodySchema,
  response: z.object({
    message: z.literal('User Registered'),
  }),
});

export type SignUpBody = z.infer<typeof signUpBodySchema>;
export type SignUpResponse = z.infer<typeof signUpEndpoint.response>;

// Login
const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginEndpoint = defineEndpoint({
  method: 'POST',
  path: '/login',
  auth: false,
  body: loginBodySchema,
  response: z.object({
    message: z.literal('Login Success'),
    token: z.string(),
  }),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type LoginResponse = z.infer<typeof loginEndpoint.response>;

// User data (protected)
export const userDataEndpoint = defineEndpoint({
  method: 'GET',
  path: '/user-data',
  auth: true,
  response: z.object({
    _id: z.string(),
    username: z.string(),
    email: z.string().email(),
    balance: z.number(),
    blockedMargin: z.number(),
    createdAt: z.string(), // ISO date string
    lastLogin: z.string().nullable(), // ISO date string
    notificationSubscription: z
      .object({
        endpoint: z.string(),
        expirationTime: z.number().nullable(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      })
      .nullable(),
  }),
});

export type UserDataResponse = z.infer<typeof userDataEndpoint.response>;

// Save subscription (protected)
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

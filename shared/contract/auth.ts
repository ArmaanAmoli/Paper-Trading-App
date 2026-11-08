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
    // Google OAuth fields
    googleId: z.string().nullable().optional(),
    authProvider: z.enum(['local', 'google']).optional(),
    avatar: z.string().nullable().optional(),
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

// Delete account (protected)
export const deleteAccountEndpoint = defineEndpoint({
  method: 'DELETE',
  path: '/user/me',
  auth: true,
  response: z.object({
    message: z.string(),
  }),
});

export type DeleteAccountResponse = z.infer<typeof deleteAccountEndpoint.response>;

// --- PKCE-based email/password login ---

// Step 1: POST /auth/login - credentials + code_challenge -> one-time code
export const loginPkceBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal('S256'),
});

export const loginPkceEndpoint = defineEndpoint({
  method: 'POST',
  path: '/auth/login',
  auth: false,
  body: loginPkceBodySchema,
  response: z.object({
    message: z.literal('Login Success'),
    code: z.string(),
  }),
});

export type LoginPkceBody = z.infer<typeof loginPkceBodySchema>;
export type LoginPkceResponse = z.infer<typeof loginPkceEndpoint.response>;

// Step 2: POST /auth/token - code + code_verifier -> sets HttpOnly cookies
export const tokenExchangeBodySchema = z.object({
  code: z.string().min(1),
  code_verifier: z.string().min(43).max(128),
});

export const tokenExchangeEndpoint = defineEndpoint({
  method: 'POST',
  path: '/auth/token',
  auth: false,
  body: tokenExchangeBodySchema,
  response: z.object({
    message: z.literal('Tokens issued'),
  }),
});

export type TokenExchangeBody = z.infer<typeof tokenExchangeBodySchema>;
export type TokenExchangeResponse = z.infer<typeof tokenExchangeEndpoint.response>;

// POST /auth/refresh - rotate refresh token
export const refreshEndpoint = defineEndpoint({
  method: 'POST',
  path: '/auth/refresh',
  auth: false,
  body: z.object({}),
  response: z.object({
    message: z.literal('Token refreshed'),
  }),
});

export type RefreshResponse = z.infer<typeof refreshEndpoint.response>;

// POST /auth/logout - revoke refresh token, clear cookies
export const logoutEndpoint = defineEndpoint({
  method: 'POST',
  path: '/auth/logout',
  auth: false,
  body: z.object({}),
  response: z.object({
    message: z.literal('Logged out'),
  }),
});

export type LogoutResponse = z.infer<typeof logoutEndpoint.response>;

// POST /auth/ws-ticket - short-lived JWT for authenticating the market-data
// WebSocket (passed as a subprotocol; HttpOnly cookies cannot be read by JS)
export const wsTicketEndpoint = defineEndpoint({
  method: 'POST',
  path: '/auth/ws-ticket',
  auth: true,
  response: z.object({
    ticket: z.string(),
  }),
});

export type WsTicketResponse = z.infer<typeof wsTicketEndpoint.response>;

// Google OAuth PKCE callback (server-side only; no request body)
export const googleAuthCallbackEndpoint = defineEndpoint({
  method: 'GET',
  path: '/api/auth/google/callback',
  auth: false,
  query: z.object({
    code: z.string().min(1),
    state: z.string().min(1),
    error: z.string().optional(),
  }),
  response: z.object({
    message: z.string(),
  }),
});

export type GoogleAuthCallbackQuery = z.infer<typeof googleAuthCallbackEndpoint.query>;
export type GoogleAuthCallbackResponse = z.infer<typeof googleAuthCallbackEndpoint.response>;

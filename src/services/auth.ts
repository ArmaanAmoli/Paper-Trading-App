import { createPkcePair } from '../lib/pkce';
import api from './api';
import type { TokenExchangeResponse, WsTicketResponse } from '@shared/contract/auth';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

export class AuthRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

async function toAuthError(response: Response, fallbackMessage: string): Promise<AuthRequestError> {
  try {
    const data = (await response.json()) as { message?: string };
    return new AuthRequestError(data.message ?? fallbackMessage, response.status);
  } catch {
    return new AuthRequestError(fallbackMessage, response.status);
  }
}

/**
 * Log in with the two-step PKCE flow:
 * 1. exchange credentials + code_challenge; the server sets the one-time
 *    authorization code as an HttpOnly cookie (never readable by JS)
 * 2. exchange code_verifier for HttpOnly session cookies — the browser
 *    attaches the auth_code cookie automatically (credentials: 'include')
 */
export async function loginWithPkce(
  email: string,
  password: string,
): Promise<TokenExchangeResponse> {
  const { verifier, challenge } = await createPkcePair();

  const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email,
      password,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }),
  });

  if (!loginResponse.ok) {
    throw await toAuthError(loginResponse, 'Invalid credentials');
  }

  // The one-time code arrives as an HttpOnly cookie, not in the body —
  // nothing to read here.
  const tokenResponse = await fetch(`${API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      code_verifier: verifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw await toAuthError(tokenResponse, 'Login failed');
  }

  // Verify the session cookies actually work before handing control back to
  // the router. If the browser rejected or lost the cookies, fail loudly here
  // instead of bouncing silently between the login and landing pages.
  for (let attempt = 0; attempt < 2; attempt++) {
    const sessionCheck = await fetch(`${API_BASE_URL}/user-data`, {
      credentials: 'include',
    });
    if (sessionCheck.ok) {
      return (await tokenResponse.json()) as TokenExchangeResponse;
    }
    if (attempt === 1) {
      throw new AuthRequestError(
        "Signed in, but the session could not be established. Clear this site's cookies and refresh the page.",
        502,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return (await tokenResponse.json()) as TokenExchangeResponse;
}

/**
 * Fetch a short-lived WebSocket ticket from the server.
 *
 * Uses the api client so an expired access token is refreshed automatically
 * before the request — a long-lived tab keeps its WS connection alive across
 * access-token expiry. The thrown AuthRequestError carries the HTTP status
 * (401 = not signed in) so the WS manager can stop retrying.
 */
export async function fetchWsTicket(): Promise<string> {
  try {
    const response = await api.post<WsTicketResponse>('/auth/ws-ticket');
    return response.data.ticket;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status ?? 0;
    throw new AuthRequestError(
      status === 401 ? 'Not signed in' : 'Could not create a websocket ticket',
      status,
    );
  }
}

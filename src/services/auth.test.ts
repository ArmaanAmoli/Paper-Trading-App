import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRequestError, fetchWsTicket, loginWithPkce } from './auth';
import { createPkcePair } from '../lib/pkce';
import api from './api';

vi.mock('../lib/pkce', () => ({
  createPkcePair: vi.fn(),
}));

vi.mock('./api', () => ({
  default: { post: vi.fn() },
}));

const mockedCreatePkcePair = vi.mocked(createPkcePair);
const mockedApiPost = vi.mocked(api.post);

beforeEach(() => {
  vi.unstubAllGlobals();
  mockedCreatePkcePair.mockReset();
  mockedApiPost.mockReset();
  mockedCreatePkcePair.mockResolvedValue({
    verifier: 'test-verifier',
    challenge: 'test-challenge',
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loginWithPkce', () => {
  it('performs the two-step PKCE login with cookie credentials', async () => {
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.endsWith('/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: 'Login Success' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: 'Tokens issued' }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await loginWithPkce('trader@example.com', 'password123');

    expect(result).toEqual({ message: 'Tokens issued' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          email: 'trader@example.com',
          password: 'password123',
          code_challenge: 'test-challenge',
          code_challenge_method: 'S256',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/auth/token',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          code_verifier: 'test-verifier',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/user-data',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('throws the server message when the login step fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Incorrect Password' }),
      }),
    );

    await expect(loginWithPkce('trader@example.com', 'password123')).rejects.toThrow(
      'Incorrect Password',
    );
  });

  it('throws a fallback message when the token step fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: unknown) => {
        const url = String(input);
        if (url.endsWith('/auth/login')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ message: 'Login Success' }),
          });
        }
        return Promise.resolve({
          ok: false,
          json: async () => ({}),
        });
      }),
    );

    await expect(loginWithPkce('trader@example.com', 'password123')).rejects.toThrow(
      'Login failed',
    );
  });

  it('throws a clear error when the session check fails after the token exchange', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: unknown) => {
        const url = String(input);
        if (url.endsWith('/auth/login')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ message: 'Login Success' }),
          });
        }
        if (url.endsWith('/auth/token')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ message: 'Tokens issued' }),
          });
        }
        // Session verification (/user-data) keeps failing: cookies were lost
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }),
    );

    await expect(loginWithPkce('trader@example.com', 'password123')).rejects.toThrow(
      'session could not be established',
    );
  });
});

describe('fetchWsTicket', () => {
  it('requests a websocket ticket through the api client', async () => {
    mockedApiPost.mockResolvedValue({ data: { ticket: 'ws-ticket-jwt' } });

    const ticket = await fetchWsTicket();

    expect(ticket).toBe('ws-ticket-jwt');
    expect(mockedApiPost).toHaveBeenCalledWith('/auth/ws-ticket');
  });

  it('throws a 401 AuthRequestError when not signed in', async () => {
    mockedApiPost.mockRejectedValue({ response: { status: 401 } });

    const error = await fetchWsTicket().catch((e) => e);

    expect(error).toBeInstanceOf(AuthRequestError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Not signed in');
  });

  it('throws a fallback message for other failures', async () => {
    mockedApiPost.mockRejectedValue({ response: { status: 500 } });

    await expect(fetchWsTicket()).rejects.toThrow('Could not create a websocket ticket');
  });
});

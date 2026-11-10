import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { route } from '../lib/route.ts';
import { defineEndpoint } from '../../shared/contract/define.ts';

describe('route()', () => {
  it('calls the handler with parsed params, query, body, user, and res', async () => {
    const endpoint = defineEndpoint({
      method: 'POST',
      path: '/test',
      auth: false,
      params: z.object({ id: z.string() }),
      query: z.object({ q: z.string() }),
      body: z.object({ name: z.string() }),
      response: z.object({ ok: z.boolean() }),
    });

    const handler = vi.fn().mockResolvedValue({ ok: true });
    const middleware = route(endpoint, handler);

    const req = {
      params: { id: '123' },
      query: { q: 'search' },
      body: { name: 'test' },
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      params: { id: '123' },
      query: { q: 'search' },
      body: { name: 'test' },
      user: undefined,
      res,
    });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('maps Zod validation errors to 400 via next', async () => {
    const endpoint = defineEndpoint({
      method: 'POST',
      path: '/test',
      auth: false,
      body: z.object({ name: z.string().min(1) }),
      response: z.object({ ok: z.boolean() }),
    });

    const handler = vi.fn();
    const middleware = route(endpoint, handler);

    const req = { body: {} } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(handler).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Validation failed');
    expect(err.issues).toBeDefined();
  });

  it('passes non-Zod errors through to next unchanged', async () => {
    const endpoint = defineEndpoint({
      method: 'GET',
      path: '/test',
      auth: false,
      response: z.object({ ok: z.boolean() }),
    });

    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const middleware = route(endpoint, handler);

    const req = {} as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toEqual(new Error('boom'));
  });
});

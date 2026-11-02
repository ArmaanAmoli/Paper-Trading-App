import { describe, expect, it, vi } from 'vitest';
import isTokenExpired from './checkTokenExpiry';
import { createExpiredToken, createJwt, createValidToken } from '../test/helpers';

describe('isTokenExpired', () => {
  it('returns false for a token that expires in the future', () => {
    expect(isTokenExpired(createValidToken())).toBe(false);
  });

  it('returns true for a token that expired in the past', () => {
    expect(isTokenExpired(createExpiredToken())).toBe(true);
  });

  it('treats a token without an exp claim as expired', () => {
    const token = 'header.eyJzdWIiOiIxMjMifQ.signature';
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true for malformed tokens', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
    expect(isTokenExpired('')).toBe(true);
  });

  it('compares the expiry timestamp against the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));

    const expiresAt = Math.floor(new Date('2026-07-01T00:00:00.000Z').getTime() / 1000);
    const expiringSoon = createJwt({ exp: expiresAt });
    expect(isTokenExpired(expiringSoon)).toBe(false);

    vi.setSystemTime(new Date('2026-07-02T00:00:00.000Z'));
    expect(isTokenExpired(expiringSoon)).toBe(true);
  });
});

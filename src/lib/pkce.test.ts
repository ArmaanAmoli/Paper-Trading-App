import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPkcePair, deriveCodeChallenge, generateCodeVerifier } from './pkce';

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateCodeVerifier', () => {
  it('returns a string of the requested length', () => {
    expect(generateCodeVerifier(64)).toHaveLength(64);
  });

  it('defaults to 96 characters', () => {
    expect(generateCodeVerifier()).toHaveLength(96);
  });

  it('uses only base64url characters', () => {
    expect(generateCodeVerifier(128)).toMatch(/^[A-Za-z0-9-_.~]+$/);
  });

  it('rejects lengths outside the RFC 7636 range', () => {
    expect(() => generateCodeVerifier(42)).toThrow();
    expect(() => generateCodeVerifier(129)).toThrow();
  });

  it('produces different verifiers on each call', () => {
    expect(generateCodeVerifier(43)).not.toBe(generateCodeVerifier(43));
  });
});

describe('deriveCodeChallenge', () => {
  it('matches the RFC 7636 Appendix B test vector', async () => {
    const challenge = await deriveCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('is deterministic', async () => {
    const verifier = generateCodeVerifier(64);

    expect(await deriveCodeChallenge(verifier)).toBe(await deriveCodeChallenge(verifier));
  });
});

describe('createPkcePair', () => {
  it('returns a matched verifier and challenge', async () => {
    const { verifier, challenge } = await createPkcePair(64);

    expect(verifier).toHaveLength(64);
    expect(challenge).toBe(await deriveCodeChallenge(verifier));
  });
});

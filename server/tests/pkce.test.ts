import { describe, it, expect } from 'vitest';
import {
  deriveCodeChallenge,
  generateCodeVerifier,
  isPlainMethod,
  isValidCodeChallenge,
  isValidCodeVerifier,
  compareCodeVerifier,
  requireS256,
  RFC7636_APPENDIX_B,
  verifyRfc7636AppendixB,
} from '../lib/pkce.ts';

describe('PKCE helpers', () => {
  describe('generateCodeVerifier', () => {
    it('returns a string of the requested length', () => {
      const v = generateCodeVerifier(96);
      expect(typeof v).toBe('string');
      expect(v.length).toBe(96);
    });

    it('defaults to 96 characters', () => {
      const v = generateCodeVerifier();
      expect(v.length).toBe(96);
    });

    it('uses only base64url characters', () => {
      const v = generateCodeVerifier(128);
      expect(/^[A-Za-z0-9-_.~]+$/.test(v)).toBe(true);
    });

    it('rejects lengths below 43', () => {
      expect(() => generateCodeVerifier(42)).toThrow();
    });

    it('rejects lengths above 128', () => {
      expect(() => generateCodeVerifier(129)).toThrow();
    });

    it('produces different verifiers on each call', () => {
      expect(generateCodeVerifier(43)).not.toBe(generateCodeVerifier(43));
    });
  });

  describe('deriveCodeChallenge', () => {
    it('matches the RFC 7636 Appendix B test vector', () => {
      const challenge = deriveCodeChallenge(RFC7636_APPENDIX_B.verifier);
      expect(challenge).toBe(RFC7636_APPENDIX_B.challenge);
    });

    it('throws for an invalid verifier', () => {
      expect(() => deriveCodeChallenge('short')).toThrow();
      expect(() => deriveCodeChallenge('not base64url!!!')).toThrow();
    });

    it('is deterministic', () => {
      const v = generateCodeVerifier(64);
      expect(deriveCodeChallenge(v)).toBe(deriveCodeChallenge(v));
    });
  });

  describe('isValidCodeVerifier', () => {
    it('accepts valid lengths and characters', () => {
      expect(isValidCodeVerifier(generateCodeVerifier(43))).toBe(true);
      expect(isValidCodeVerifier(generateCodeVerifier(128))).toBe(true);
    });

    it('rejects non-strings', () => {
      expect(isValidCodeVerifier(undefined)).toBe(false);
      expect(isValidCodeVerifier(null)).toBe(false);
      expect(isValidCodeVerifier(123)).toBe(false);
    });

    it('rejects too short or too long strings', () => {
      expect(isValidCodeVerifier('a'.repeat(42))).toBe(false);
      expect(isValidCodeVerifier('a'.repeat(129))).toBe(false);
    });

    it('rejects non-base64url characters', () => {
      expect(isValidCodeVerifier('a'.repeat(43) + '!')).toBe(false);
      expect(isValidCodeVerifier('a/b=c')).toBe(false);
    });
  });

  describe('isValidCodeChallenge', () => {
    it('accepts valid challenges', () => {
      expect(isValidCodeChallenge(RFC7636_APPENDIX_B.challenge)).toBe(true);
    });

    it('rejects non-strings and bad lengths', () => {
      expect(isValidCodeChallenge(undefined)).toBe(false);
      expect(isValidCodeChallenge('short')).toBe(false);
    });
  });

  describe('compareCodeVerifier', () => {
    it('returns true for identical verifiers', () => {
      const v = generateCodeVerifier(70);
      expect(compareCodeVerifier(v, v)).toBe(true);
    });

    it('returns false for different verifiers', () => {
      expect(compareCodeVerifier(generateCodeVerifier(50), generateCodeVerifier(50))).toBe(false);
    });

    it('returns false for different lengths', () => {
      expect(compareCodeVerifier(generateCodeVerifier(43), generateCodeVerifier(44))).toBe(false);
    });

    it('returns false for invalid inputs', () => {
      expect(compareCodeVerifier(undefined, generateCodeVerifier(50))).toBe(false);
      expect(compareCodeVerifier('short', generateCodeVerifier(50))).toBe(false);
      expect(compareCodeVerifier('not base64url!!!', generateCodeVerifier(50))).toBe(false);
    });
  });

  describe('isPlainMethod', () => {
    it('returns true only for plain', () => {
      expect(isPlainMethod('plain')).toBe(true);
      expect(isPlainMethod('S256')).toBe(false);
      expect(isPlainMethod(undefined)).toBe(false);
    });
  });

  describe('requireS256', () => {
    it('passes for S256', () => {
      expect(() => requireS256('S256')).not.toThrow();
    });

    it('throws for plain', () => {
      expect(() => requireS256('plain')).toThrow(/S256/);
    });

    it('throws for undefined', () => {
      expect(() => requireS256(undefined)).toThrow(/S256/);
    });
  });

  describe('verifyRfc7636AppendixB', () => {
    it('returns true', () => {
      expect(verifyRfc7636AppendixB()).toBe(true);
    });
  });
});

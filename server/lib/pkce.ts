import { createHash, randomBytes } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';

/**
 * PKCE helpers per RFC 7636.
 *
 * Only the S256 code challenge method is supported. `plain` is explicitly
 * rejected everywhere it could appear.
 */

export type CodeChallengeMethod = 'S256';

/**
 * Maximum and minimum verifier lengths allowed by RFC 7636.
 */
const CODE_VERIFIER_MIN_LENGTH = 43;
const CODE_VERIFIER_MAX_LENGTH = 128;

/**
 * Generate a cryptographically random code verifier.
 *
 * Returns a base64url-encoded string without padding, 43–128 characters long.
 */
export function generateCodeVerifier(length: number = 96): string {
  if (length < CODE_VERIFIER_MIN_LENGTH || length > CODE_VERIFIER_MAX_LENGTH) {
    throw new Error(
      `code_verifier length must be between ${CODE_VERIFIER_MIN_LENGTH} and ${CODE_VERIFIER_MAX_LENGTH}`,
    );
  }

  // ceil(length * 3 / 4) random bytes, then trim to exactly `length` chars.
  const byteCount = Math.ceil((length * 3) / 4);
  const bytes = randomBytes(byteCount);
  const verifier = bytes.toString('base64url').slice(0, length);

  return verifier;
}

/**
 * Derive the code challenge from a code verifier using SHA-256.
 *
 * challenge = base64url(SHA-256(verifier))
 */
export function deriveCodeChallenge(verifier: string): string {
  if (!isValidCodeVerifier(verifier)) {
    throw new Error('Invalid code_verifier: must be 43–128 base64url characters');
  }

  const digest = createHash('sha256').update(verifier, 'utf8').digest();
  return digest.toString('base64url');
}

/**
 * Validate a code verifier against RFC 7636 rules.
 */
export function isValidCodeVerifier(verifier: unknown): verifier is string {
  if (typeof verifier !== 'string') {
    return false;
  }
  if (verifier.length < CODE_VERIFIER_MIN_LENGTH || verifier.length > CODE_VERIFIER_MAX_LENGTH) {
    return false;
  }
  // base64url alphabet: [A-Za-z0-9-_.~] (no padding)
  return /^[A-Za-z0-9-_.~]+$/.test(verifier);
}

/**
 * Validate a code challenge against RFC 7636 rules.
 */
export function isValidCodeChallenge(challenge: unknown): challenge is string {
  if (typeof challenge !== 'string') {
    return false;
  }
  if (challenge.length < CODE_VERIFIER_MIN_LENGTH || challenge.length > CODE_VERIFIER_MAX_LENGTH) {
    return false;
  }
  return /^[A-Za-z0-9-_.~]+$/.test(challenge);
}

/**
 * Constant-time comparison of two code verifiers.
 *
 * Returns true only when both inputs are valid verifiers of equal length
 * and identical content. Never returns early based on input content.
 */
export function compareCodeVerifier(a: unknown, b: unknown): boolean {
  if (!isValidCodeVerifier(a) || !isValidCodeVerifier(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * Reject the `plain` code challenge method explicitly.
 */
export function isPlainMethod(method: string | undefined): method is 'plain' {
  return method === 'plain';
}

/**
 * Assert that a challenge method is S256. Throws for `plain` or anything else.
 */
export function requireS256(method: string | undefined): asserts method is CodeChallengeMethod {
  if (method !== 'S256') {
    throw new Error(
      `Unsupported code_challenge_method: ${method ?? 'undefined'}. Only S256 is allowed.`,
    );
  }
}

/**
 * RFC 7636 Appendix B test vector.
 *
 * Verifier: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
 * Challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
 */
export const RFC7636_APPENDIX_B = {
  verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
} as const;

/**
 * Verify a verifier against a challenge using the RFC 7636 Appendix B vector
 * as a sanity check.
 */
export function verifyRfc7636AppendixB(): boolean {
  return (
    compareCodeVerifier(
      RFC7636_APPENDIX_B.verifier,
      deriveCodeChallenge(RFC7636_APPENDIX_B.verifier) === RFC7636_APPENDIX_B.challenge
        ? RFC7636_APPENDIX_B.verifier
        : '',
    ) && deriveCodeChallenge(RFC7636_APPENDIX_B.verifier) === RFC7636_APPENDIX_B.challenge
  );
}

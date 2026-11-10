const CODE_VERIFIER_MIN_LENGTH = 43;
const CODE_VERIFIER_MAX_LENGTH = 128;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Generate a cryptographically random PKCE code verifier (RFC 7636).
 */
export function generateCodeVerifier(length: number = 96): string {
  if (length < CODE_VERIFIER_MIN_LENGTH || length > CODE_VERIFIER_MAX_LENGTH) {
    throw new Error(
      `code_verifier length must be between ${CODE_VERIFIER_MIN_LENGTH} and ${CODE_VERIFIER_MAX_LENGTH}`,
    );
  }

  const byteCount = Math.ceil((length * 3) / 4);
  const bytes = new Uint8Array(byteCount);
  globalThis.crypto.getRandomValues(bytes);

  return toBase64Url(bytes).slice(0, length);
}

/**
 * Derive an S256 PKCE code challenge from a code verifier.
 */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );

  return toBase64Url(new Uint8Array(digest));
}

/**
 * Create a matched verifier/challenge pair for the login flow.
 */
export async function createPkcePair(length: number = 96): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = generateCodeVerifier(length);
  const challenge = await deriveCodeChallenge(verifier);

  return { verifier, challenge };
}

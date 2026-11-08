import { createHash } from 'node:crypto';
import { validate as validateUuid, v4 as uuidv4 } from 'uuid';
import { AuthCode, RefreshToken, OAuthTransaction } from '../Schemas/mongoSchema.js';
import { AppError } from './errors.js';
import { deriveCodeChallenge, isValidCodeVerifier } from './pkce.js';

const AUTH_CODE_TTL_MS = 90 * 1000; // 90 seconds (within the 60–120s requirement)
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Multiple open tabs refresh concurrently and can present a token that was
// rotated moments ago. Reuse within this window is treated as a legitimate
// concurrent refresh instead of a stolen-token replay.
const REFRESH_REUSE_GRACE_MS = 30 * 1000;

/**
 * Create a deterministic, irreversible lookup hash for a high-entropy secret.
 * SHA-256 is appropriate here because authorization codes and refresh tokens
 * are cryptographically random; it also lets us look records up by hash.
 */
function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

/**
 * Create a one-time, short-lived authorization code bound to a user and a
 * PKCE code challenge. Returns the plaintext code exactly once.
 */
export async function createAuthCode({
  userId,
  codeChallenge,
}: {
  userId: string;
  codeChallenge: string;
}): Promise<string> {
  const code = uuidv4();
  const codeHash = hashSecret(code);
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

  await AuthCode.create({
    codeHash,
    userId,
    codeChallenge,
    used: false,
    expiresAt,
  });

  return code;
}

/**
 * Validate and consume an authorization code.
 *
 * - The code must exist, be unused, and not be expired.
 * - The provided verifier must derive to the stored challenge.
 * - On success the code is deleted (single-use).
 *
 * Returns the bound userId.
 */
export async function consumeAuthCode({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}): Promise<{ userId: string }> {
  if (!isValidCodeVerifier(codeVerifier)) {
    throw new AppError(400, 'Invalid code_verifier');
  }

  const record = await AuthCode.findOne({ codeHash: hashSecret(code) });

  if (!record) {
    throw new AppError(401, 'Invalid or expired authorization code');
  }

  // Verify the PKCE binding: challenge == derive(verifier)
  const expectedChallenge = deriveCodeChallenge(codeVerifier);
  if (record.codeChallenge !== expectedChallenge) {
    throw new AppError(401, 'code_verifier does not match the authorization code');
  }

  // Check expiry explicitly (TTL index is a backup)
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    await record.deleteOne();
    throw new AppError(401, 'Authorization code expired');
  }

  const userId = record.userId.toString();

  // Single-use: delete immediately after validation
  await record.deleteOne();

  return { userId };
}

/**
 * Issue a refresh token for a user. Returns the plaintext token exactly once.
 * All tokens from one login share a familyId.
 */
export async function createRefreshToken({
  userId,
  familyId,
}: {
  userId: string;
  familyId: string;
}): Promise<string> {
  const token = uuidv4();
  const tokenHash = hashSecret(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    tokenHash,
    userId,
    familyId,
    revoked: false,
    familyRevoked: false,
    expiresAt,
  });

  return token;
}

/**
 * Rotate a refresh token.
 *
 * - Finds the token by hash.
 * - Detects reuse: if the presented token is already revoked, revokes the
 *   entire family and rejects.
 * - Otherwise revokes the old token and issues a new one in the same family.
 *
 * Returns { token, familyId, userId }.
 */
export async function rotateRefreshToken({
  token,
}: {
  token: string;
}): Promise<{ token: string; familyId: string; userId: string }> {
  if (typeof token !== 'string' || !validateUuid(token)) {
    throw new AppError(401, 'Invalid refresh token');
  }

  const tokenHash = hashSecret(token);
  const record = await RefreshToken.findOne({ tokenHash });
  if (!record) {
    throw new AppError(401, 'Invalid refresh token');
  }

  if (record.revoked || record.familyRevoked) {
    // Grace window: a token revoked seconds ago is most likely being presented
    // by a second tab that started its refresh before the rotation landed.
    // Issue a fresh token in the same family instead of killing the session.
    // Logout sets familyRevoked, so logged-out families can never be revived.
    const withinGrace =
      !record.familyRevoked &&
      record.revokedAt !== null &&
      record.revokedAt !== undefined &&
      Date.now() - record.revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS;

    if (!withinGrace) {
      // Reuse after the grace window: revoke the whole family
      const now = new Date();
      await RefreshToken.updateMany(
        { familyId: record.familyId, revoked: false },
        { revoked: true, revokedAt: now },
      );
      await RefreshToken.updateOne({ _id: record._id }, { familyRevoked: true, revokedAt: now });
      throw new AppError(401, 'Refresh token reuse detected; family revoked');
    }
    // Fall through: the old token stays revoked (revokedAt is NOT refreshed,
    // so repeated replays cannot extend the grace window).
  }

  const userId = record.userId.toString();
  const familyId = record.familyId;

  // Revoke the old token
  await record.updateOne({ revoked: true, revokedAt: new Date() });

  // Issue a new token in the same family
  const newToken = uuidv4();
  const newTokenHash = hashSecret(newToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    tokenHash: newTokenHash,
    userId,
    familyId,
    revoked: false,
    familyRevoked: false,
    expiresAt,
  });

  return { token: newToken, familyId, userId };
}

/**
 * Revoke a refresh token and its family on logout.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashSecret(token);
  const record = await RefreshToken.findOne({ tokenHash });
  if (!record) return;

  // Logout kills the whole family outright — the grace window must not be
  // able to resurrect a logged-out session.
  await RefreshToken.updateMany(
    { familyId: record.familyId },
    { revoked: true, revokedAt: new Date(), familyRevoked: true },
  );
}

/**
 * Revoke all refresh tokens for a user (e.g. on account deletion).
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await RefreshToken.deleteMany({ userId });
}

/**
 * Create a short-lived server-side OAuth transaction record for the Google
 * PKCE flow. Returns the opaque transaction id to be stored in a cookie.
 */
export async function createOAuthTransaction({
  codeVerifier,
  state,
  origin,
  callbackUrl,
  userId,
}: {
  codeVerifier: string;
  state: string;
  origin: string;
  callbackUrl: string;
  userId?: string;
}): Promise<string> {
  const transactionId = uuidv4();
  const expiresAt = new Date(Date.now() + OAUTH_TRANSACTION_TTL_MS);

  await OAuthTransaction.create({
    transactionId,
    userId: userId ?? null,
    codeVerifier,
    state,
    origin,
    callbackUrl,
    expiresAt,
  });

  return transactionId;
}

/**
 * Validate and consume an OAuth transaction by transaction id.
 *
 * - The transaction must exist and not be expired.
 * - The returned state must match the expected state.
 * - On success the transaction is deleted (single-use).
 *
 * Returns { codeVerifier, origin, callbackUrl }.
 */
export async function consumeOAuthTransaction({
  transactionId,
  expectedState,
}: {
  transactionId: string;
  expectedState: string;
}): Promise<{ codeVerifier: string; origin: string; callbackUrl: string }> {
  const record = await OAuthTransaction.findOne({ transactionId });
  if (!record) {
    throw new AppError(401, 'Invalid or expired OAuth transaction');
  }

  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    await record.deleteOne();
    throw new AppError(401, 'OAuth transaction expired');
  }

  // Constant-time state comparison
  if (expectedState !== record.state) {
    throw new AppError(401, 'OAuth state mismatch');
  }

  const { codeVerifier, origin, callbackUrl } = record;

  // Single-use
  await record.deleteOne();

  return { codeVerifier, origin, callbackUrl };
}

/**
 * Revoke all auth codes for a user (e.g. on logout / account deletion).
 */
export async function revokeAllAuthCodes(userId: string): Promise<void> {
  await AuthCode.deleteMany({ userId });
}

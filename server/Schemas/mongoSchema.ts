import mongoose, { Schema, type Document, type InferSchemaType } from 'mongoose';

const NotificationSubscriberSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: false },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    avatar: { type: String },
    balance: { type: Number, default: 1_000_000 },
    blockedMargin: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    notificationSubscription: NotificationSubscriberSchema,
  },
  { timestamps: false },
);

export type UserDocument = InferSchemaType<typeof UserSchema> & Document;
export const User = mongoose.model<UserDocument>('User', UserSchema);

const WatchlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbols: { type: [String], required: true, default: [] },
  },
  { timestamps: false },
);

export type WatchlistDocument = InferSchemaType<typeof WatchlistSchema> & Document;
export const Watchlist = mongoose.model<WatchlistDocument>('Watchlist', WatchlistSchema);

const PortfolioSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    shares: { type: Number, required: true },
    avgPrice: { type: Number, required: true },
    positionType: { type: String, enum: ['long', 'short'] },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

export type PortfolioDocument = InferSchemaType<typeof PortfolioSchema> & Document;
export const Portfolio = mongoose.model<PortfolioDocument>('Portfolio', PortfolioSchema);

const TradeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    shares: { type: Number, required: true },
    price: { type: Number, required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    timestamp: { type: Date, default: Date.now },
    realizedPL: { type: Number, required: true },
    orderId: { type: String, required: true, unique: true },
    wasStopLoss: { type: Boolean, required: true, default: false },
  },
  { timestamps: false },
);

export type TradeDocument = InferSchemaType<typeof TradeSchema> & Document;
export const Trade = mongoose.model<TradeDocument>('Trade', TradeSchema);

const StopLossSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    price: { type: Number, required: true },
    startDate: { type: Date, default: Date.now, required: true },
    type: { type: String, enum: ['buy', 'sell'], required: true },
    qty: { type: Number, required: true },
  },
  { timestamps: false },
);

export type StopLossDocument = InferSchemaType<typeof StopLossSchema> & Document;
export const StopLoss = mongoose.model<StopLossDocument>('StopLoss', StopLossSchema);

// --------------------------------------------------------------------------
// PKCE / session models (added for OAuth 2.1 / RFC 7636 compliance)
// --------------------------------------------------------------------------

const AuthCodeSchema = new Schema(
  {
    // Hash of the one-time authorization code (never stored plaintext)
    codeHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // PKCE code challenge the code is bound to
    codeChallenge: { type: String, required: true },
    // Single-use: deleted / invalidated after first successful exchange
    used: { type: Boolean, default: false },
    // Short-lived: 60–120 seconds
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: false },
);

export type AuthCodeDocument = InferSchemaType<typeof AuthCodeSchema> & Document;
export const AuthCode = mongoose.model<AuthCodeDocument>('AuthCode', AuthCodeSchema);

const RefreshTokenSchema = new Schema(
  {
    // Hash of the refresh token (never stored plaintext)
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Token family id: all rotations of one login share the same familyId
    familyId: { type: String, required: true, index: true },
    // Rotated on every refresh; old token is revoked
    revoked: { type: Boolean, default: false },
    // When the token was revoked — used for the multi-tab rotation grace window
    revokedAt: { type: Date, default: null },
    // Reuse of a revoked token in the same family revokes the whole family
    familyRevoked: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: false },
);

export type RefreshTokenDocument = InferSchemaType<typeof RefreshTokenSchema> & Document;
export const RefreshToken = mongoose.model<RefreshTokenDocument>(
  'RefreshToken',
  RefreshTokenSchema,
);

const OAuthTransactionSchema = new Schema(
  {
    // Opaque id stored in a short-lived cookie; keys the PKCE transaction
    transactionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    // PKCE code verifier (hashed? no — needed in plaintext at exchange; stored
    // server-side only, short-lived, HttpOnly cookie references this record)
    codeVerifier: { type: String, required: true },
    // OAuth state for CSRF protection on the Google flow
    state: { type: String, required: true },
    // Origin the user came from, for post-callback redirect
    origin: { type: String, required: true },
    // Exact redirect_uri sent to Google for this transaction. The callback
    // must be served on the origin the user started from: cookies are
    // host-scoped, so a callback on localhost would never see the
    // google_oauth_tx cookie (or set session cookies) for a tab browsing
    // 127.0.0.1, and vice versa.
    callbackUrl: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: false },
);

export type OAuthTransactionDocument = InferSchemaType<typeof OAuthTransactionSchema> & Document;
export const OAuthTransaction = mongoose.model<OAuthTransactionDocument>(
  'OAuthTransaction',
  OAuthTransactionSchema,
);

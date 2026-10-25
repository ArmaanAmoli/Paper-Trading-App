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
    passwordHash: { type: String, required: true },
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

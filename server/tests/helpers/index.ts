import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Trade, Portfolio, Watchlist, StopLoss } from '../../Schemas/mongoSchema.ts';
import { createTestApp, type TestApp } from '../createTestApp.js';

const JWT_SECRET = process.env.JWT_SECRET as string;

export function createAuthToken(
  payload: { userId: string; email: string },
  secret: string = JWT_SECRET,
): string {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

export function createExpiredToken(
  payload: { userId: string; email: string },
  secret: string = JWT_SECRET,
): string {
  return jwt.sign(payload, secret, { expiresIn: '-1s' });
}

export function createTamperedToken(validToken: string): string {
  return validToken.slice(0, -5) + 'XXXXX';
}

export async function createTestUser(
  overrides: Partial<{
    email: string;
    password: string;
    username: string;
    passwordHash: string | null;
    googleId: string | null;
    authProvider: 'local' | 'google';
    balance: number;
  }> = {},
) {
  const {
    email = `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.local`,
    password = 'password123',
    username = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    passwordHash = password ? await bcrypt.hash(password, 10) : null,
    googleId = null,
    authProvider = 'local',
    balance = 1_000_000,
  } = overrides;

  const user = new User({
    username,
    email,
    passwordHash,
    authProvider,
    balance,
    createdAt: new Date(),
    lastLogin: new Date(),
  });
  // NOTE: `googleId` has a unique+sparse index. MongoDB's sparse index only skips
  // *missing* fields, so an explicit `googleId: null` would collide across users
  // (E11000 on googleId_1). Omit the field entirely for local users.
  if (googleId !== null) {
    user.googleId = googleId;
  }
  await user.save();
  return user;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function clearDb() {
  const collections = await mongoose.connection.db?.collections();
  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
}

export function makeApp(): TestApp {
  return createTestApp();
}

export { User, Trade, Portfolio, Watchlist, StopLoss, mongoose };

import { beforeAll, afterEach, afterAll } from 'vitest';
import mongoose from 'mongoose';

// Guard: never run tests unless NODE_ENV is test and DB points locally.
if (process.env.NODE_ENV !== 'test') {
  throw new Error(
    `Tests must run with NODE_ENV=test. Current value: ${process.env.NODE_ENV}`,
  );
}

if (!process.env.MONGO_URL || !process.env.MONGO_URL.includes('127.0.0.1')) {
  throw new Error(
    `Tests must use a local test database. Current MONGO_URL: ${process.env.MONGO_URL}`,
  );
}

const requiredEnvs = [
  'JWT_SECRET',
  'FAST_API_SERVER_DOMAIN',
  'FAST_API_WEB_SOCKET_SERVER_DOMAIN',
  'JWT_TOKEN_05_2036',
  'WEB_PUSH_PUBLIC_KEY',
  'WEB_PUSH_PRIVATE_KEY',
  'EXCHANGE_RATE_API',
  'VITE_API_BASE_URL',
  'VITE_WEB_PUSH_PUBLIC_KEY',
] as const;

for (const key of requiredEnvs) {
  if (!process.env[key]) {
    throw new Error(`Test setup aborted: required env var ${key} is not set.`);
  }
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URL!);
  }
});

afterEach(async () => {
  const collections = await mongoose.connection.db?.collections();
  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

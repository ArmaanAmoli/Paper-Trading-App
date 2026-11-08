import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import {
  AuthCode,
  OAuthTransaction,
  RefreshToken,
  User,
  Trade,
  Portfolio,
  Watchlist,
  StopLoss,
} from '../Schemas/mongoSchema.ts';

let replSet: MongoMemoryReplSet | undefined;

export default async function globalSetup() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test setup aborted: NODE_ENV must be "test" to run the test suite.');
  }

  // A replica set is required: the application's deleteUser() flow uses
  // multi-document transactions, which standalone mongod instances reject
  // ("Transaction numbers are only allowed on a replica set member or mongos").
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const uri = replSet.getUri();

  // MongoDB defaults `maxTransactionLockRequestTimeoutMillis` to 5ms. The suite
  // mixes transaction-based writes (executeTrade, deleteUser) with the per-test
  // collection cleanup, which can collide and fail with
  // "Unable to acquire IX lock ... within 5ms". Raise the timeout for tests only.
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db('admin').command({
      setParameter: 1,
      maxTransactionLockRequestTimeoutMillis: 1000,
    });
  } finally {
    await client.close();
  }

  process.env.MONGO_URL = uri;

  await preCreateCollectionsAndIndexes(uri);
}

/**
 * Creates every collection and index up front, before any test worker connects.
 *
 * MongoDB rejects writes inside a transaction while a catalog change (collection
 * creation or index build) is in flight for that collection:
 *   "Unable to write to collection 'test.users' due to catalog changes; please
 *    retry the operation"
 * Mongoose normally creates collections/indexes lazily in the background after
 * `mongoose.connect()`, so a worker could start a transaction (deleteUser) while
 * another worker was still building indexes -> spurious HTTP 500 responses.
 * Building everything here keeps the catalog stable for the whole test run while
 * still enforcing the unique indexes the tests rely on.
 */
async function preCreateCollectionsAndIndexes(uri: string) {
  const models = [
    User,
    Trade,
    Portfolio,
    Watchlist,
    StopLoss,
    AuthCode,
    RefreshToken,
    OAuthTransaction,
  ];

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Test setup aborted: could not open a database handle.');
  }

  try {
    for (const model of models) {
      const collectionName = model.collection.collectionName;
      const exists = await db
        .listCollections({ name: collectionName }, { nameOnly: true })
        .hasNext();
      if (!exists) {
        await db.createCollection(collectionName);
      }
      await model.createIndexes();
    }
  } finally {
    await mongoose.disconnect();
  }
}

export async function teardown() {
  if (replSet) {
    await replSet.stop();
    replSet = undefined;
  }
}

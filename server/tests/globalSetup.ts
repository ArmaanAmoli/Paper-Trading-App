import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let replSet: MongoMemoryReplSet | undefined;

export default async function globalSetup() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'Test setup aborted: NODE_ENV must be "test" to run the test suite.',
    );
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
}

export async function teardown() {
  if (replSet) {
    await replSet.stop();
    replSet = undefined;
  }
}

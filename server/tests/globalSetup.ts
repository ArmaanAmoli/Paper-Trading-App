import { MongoMemoryReplSet } from 'mongodb-memory-server';

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

  process.env.MONGO_URL = replSet.getUri();
}

export async function teardown() {
  if (replSet) {
    await replSet.stop();
    replSet = undefined;
  }
}

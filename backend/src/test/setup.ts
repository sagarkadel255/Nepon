import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Test bootstrap: spins up an isolated in-memory MongoDB so tests can freely
 * delete data and insert fixtures without touching the real cluster. Overrides
 * MONGODB_URI before any test file imports the app config.
 */
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  // Point the config at the ephemeral instance for any code that reads it.
  process.env.MONGODB_URI = uri;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

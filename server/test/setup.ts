import { afterAll, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789-abcdefghij';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789-abcdefghij';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.DEMO_ENABLED = 'true';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('fintrack-test'));
  // Build unique indexes before tests rely on them.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

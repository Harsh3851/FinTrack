/**
 * Local fallback when MongoDB is not installed: boots an in-memory MongoDB,
 * seeds the demo user and starts the API. Data is lost when the process exits.
 *   npm run dev:memory -w server
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri('fintrack');
process.env.JWT_ACCESS_SECRET ??= 'dev-only-access-secret-change-me-0123456789';
process.env.JWT_REFRESH_SECRET ??= 'dev-only-refresh-secret-change-me-0123456789';

const { logger } = await import('../config/logger');
const { connectDatabase } = await import('../config/db');
const { seedDemoUser } = await import('./seed');
const { createApp } = await import('../app');
const { env } = await import('../config/env');

await connectDatabase(env.MONGODB_URI!);
const seeded = await seedDemoUser();
logger.info(seeded, 'In-memory MongoDB ready and demo user seeded');

const server = createApp().listen(env.PORT, () => {
  logger.info(`FinTrack API (in-memory DB) on http://localhost:${env.PORT}`);
});

const stop = async () => {
  server.close();
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

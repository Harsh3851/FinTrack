import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/db';
import { createApp } from './app';

async function main() {
  if (!env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Use `npm run dev:memory -w server` for an in-memory database.',
    );
  }
  await connectDatabase(env.MONGODB_URI);
  const server = createApp().listen(env.PORT, () => {
    logger.info(`FinTrack API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});

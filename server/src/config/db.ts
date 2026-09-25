import mongoose from 'mongoose';
import { logger } from './logger';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info(
    { host: mongoose.connection.host, db: mongoose.connection.name },
    'MongoDB connected',
  );
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

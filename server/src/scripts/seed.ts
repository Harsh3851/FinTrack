/**
 * Creates (or resets) the demo user with twelve months of realistic data.
 *   npm run seed            (uses MONGODB_URI from server/.env)
 */
import bcrypt from 'bcryptjs';
import { DEMO_USER } from '@fintrack/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { UserModel } from '../models';
import { seedDemoDataForUser } from '../services/seed.service';

export async function seedDemoUser() {
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);
  const user = await UserModel.findOneAndUpdate(
    { email: DEMO_USER.email },
    { name: DEMO_USER.name, email: DEMO_USER.email, passwordHash, isDemo: true },
    { upsert: true, new: true },
  );
  const { transactions } = await seedDemoDataForUser(String(user._id));
  return { email: DEMO_USER.email, transactions };
}

async function main() {
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is required to seed');
  await connectDatabase(env.MONGODB_URI);
  const result = await seedDemoUser();
  logger.info(result, `Seeded demo user (password: ${DEMO_USER.password})`);
  await disconnectDatabase();
}

const isDirectRun = process.argv[1]?.includes('seed');
if (isDirectRun) {
  main().catch((err) => {
    logger.fatal({ err }, 'Seeding failed');
    process.exit(1);
  });
}

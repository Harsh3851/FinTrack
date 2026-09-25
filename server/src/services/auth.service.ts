import bcrypt from 'bcryptjs';
import { DEMO_USER, type LoginInput, type RegisterInput, type User } from '@fintrack/shared';
import { UserModel } from '../models';
import { conflict, unauthorized } from '../utils/app-error';
import { toUserDto } from '../utils/serialize';
import { seedDefaultsForUser, seedDemoDataForUser } from './seed.service';
import { isTest } from '../config/env';

const BCRYPT_ROUNDS = isTest ? 4 : 12;
// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

export async function register(input: RegisterInput): Promise<User> {
  const exists = await UserModel.exists({ email: input.email });
  if (exists) throw conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await UserModel.create({ name: input.name, email: input.email, passwordHash });
  await seedDefaultsForUser(String(user._id));
  return toUserDto(user);
}

export async function login(input: LoginInput): Promise<User> {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Incorrect email or password');
  return toUserDto(user);
}

/** Returns the demo user, creating and seeding it on first use. */
export async function getOrCreateDemoUser(): Promise<User> {
  const existing = await UserModel.findOne({ email: DEMO_USER.email });
  if (existing) return toUserDto(existing);
  const passwordHash = await bcrypt.hash(DEMO_USER.password, BCRYPT_ROUNDS);
  const user = await UserModel.create({
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    passwordHash,
    isDemo: true,
  });
  await seedDemoDataForUser(String(user._id));
  return toUserDto(user);
}

export async function getUser(userId: string): Promise<User> {
  const user = await UserModel.findById(userId);
  if (!user) throw unauthorized('Account no longer exists');
  return toUserDto(user);
}

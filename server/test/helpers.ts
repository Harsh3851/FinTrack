import request from 'supertest';
import mongoose from 'mongoose';
import type { Account, AuthResponse, Category } from '@fintrack/shared';
import { createApp } from '../src/app';

export const app = createApp();

export async function resetDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

let counter = 0;

export async function registerUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
) {
  counter += 1;
  const credentials = {
    name: 'Priya Sharma',
    email: `priya${counter}@example.com`,
    password: 'Sup3rSecret!',
    ...overrides,
  };
  const res = await request(app).post('/api/v1/auth/register').send(credentials).expect(201);
  const body = res.body as AuthResponse;
  const cookie = res.headers['set-cookie'] as unknown as string[];
  return { ...body, credentials, cookie, auth: { Authorization: `Bearer ${body.accessToken}` } };
}

export async function fixtures(auth: Record<string, string>) {
  const [cats, accts] = await Promise.all([
    request(app).get('/api/v1/categories').set(auth).expect(200),
    request(app).get('/api/v1/accounts').set(auth).expect(200),
  ]);
  const categories = cats.body.data as Category[];
  const byName = (name: string) => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`Missing category ${name}`);
    return found;
  };
  return {
    categories,
    accounts: accts.body.data as Account[],
    food: byName('Food & Dining'),
    rent: byName('Rent'),
    salary: byName('Salary'),
    bank: (accts.body.data as Account[])[0]!,
  };
}

export function tx(auth: Record<string, string>, body: Record<string, unknown>) {
  return request(app).post('/api/v1/transactions').set(auth).send(body);
}

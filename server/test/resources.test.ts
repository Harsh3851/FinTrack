import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { currentMonthKey, todayIso } from '@fintrack/shared';
import { app, fixtures, registerUser, resetDatabase, tx } from './helpers';

describe('accounts, categories, budgets and dashboard', () => {
  let auth: Record<string, string>;
  let f: Awaited<ReturnType<typeof fixtures>>;
  const today = todayIso();
  const month = currentMonthKey();

  beforeEach(async () => {
    await resetDatabase();
    ({ auth } = await registerUser());
    f = await fixtures(auth);
  });

  it('computes running account balances', async () => {
    const created = await request(app)
      .post('/api/v1/accounts')
      .set(auth)
      .send({ name: 'Cash', type: 'cash', openingBalance: 500_000, color: '#1baf7a' })
      .expect(201);
    const cash = created.body.data;
    expect(cash.balance).toBe(500_000);

    await tx(auth, {
      type: 'income',
      amount: 100_000,
      categoryId: f.salary.id,
      accountId: cash.id,
      date: today,
    }).expect(201);
    await tx(auth, {
      type: 'expense',
      amount: 25_050,
      categoryId: f.food.id,
      accountId: cash.id,
      date: today,
    }).expect(201);

    const list = await request(app).get('/api/v1/accounts').set(auth).expect(200);
    const updated = list.body.data.find((a: { id: string }) => a.id === cash.id);
    expect(updated).toMatchObject({ balance: 574_950, transactionCount: 2 });
  });

  it('prevents deleting accounts and categories that are in use', async () => {
    await tx(auth, {
      type: 'expense',
      amount: 1_000,
      categoryId: f.food.id,
      accountId: f.bank.id,
      date: today,
    }).expect(201);
    const acc = await request(app).delete(`/api/v1/accounts/${f.bank.id}`).set(auth).expect(409);
    expect(acc.body.error.message).toMatch(/1 transaction/);
    await request(app).delete(`/api/v1/categories/${f.food.id}`).set(auth).expect(409);
    await request(app).delete(`/api/v1/categories/${f.rent.id}`).set(auth).expect(204);
  });

  it('rejects duplicate category names case-insensitively', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set(auth)
      .send({ name: 'food & dining', type: 'expense', icon: 'coffee', color: '#eb6834' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
    await request(app)
      .post('/api/v1/categories')
      .set(auth)
      .send({ name: 'Pets', type: 'expense', icon: 'heart-pulse', color: '#eb6834' })
      .expect(201);
  });

  it('tracks monthly budgets with warning and over-budget states', async () => {
    await request(app)
      .put(`/api/v1/budgets/${f.food.id}`)
      .set(auth)
      .send({ amount: 500_000 })
      .expect(200);
    await request(app)
      .put(`/api/v1/budgets/${f.rent.id}`)
      .set(auth)
      .send({ amount: 100_000 })
      .expect(200);
    await request(app)
      .put(`/api/v1/budgets/${f.salary.id}`)
      .set(auth)
      .send({ amount: 1_000 })
      .expect(400);

    await tx(auth, {
      type: 'expense',
      amount: 420_000,
      categoryId: f.food.id,
      accountId: f.bank.id,
      date: today,
    }).expect(201);
    await tx(auth, {
      type: 'expense',
      amount: 150_000,
      categoryId: f.rent.id,
      accountId: f.bank.id,
      date: today,
    }).expect(201);

    const res = await request(app).get(`/api/v1/budgets?month=${month}`).set(auth).expect(200);
    const [rent, food] = res.body.data;
    expect(rent).toMatchObject({
      amount: 100_000,
      spent: 150_000,
      remaining: -50_000,
      state: 'over',
    });
    expect(food).toMatchObject({ amount: 500_000, spent: 420_000, state: 'warning' });

    // Updating is an upsert on the same category.
    const updated = await request(app)
      .put(`/api/v1/budgets/${f.food.id}`)
      .set(auth)
      .send({ amount: 900_000 })
      .expect(200);
    expect(updated.body.data.state).toBe('ok');
    await request(app).delete(`/api/v1/budgets/${f.food.id}`).set(auth).expect(204);
    await request(app).delete(`/api/v1/budgets/${f.food.id}`).set(auth).expect(404);
  });

  it('summarises the month for the dashboard', async () => {
    await tx(auth, {
      type: 'income',
      amount: 10_000_000,
      categoryId: f.salary.id,
      accountId: f.bank.id,
      date: today,
    }).expect(201);
    await tx(auth, {
      type: 'expense',
      amount: 2_600_000,
      categoryId: f.rent.id,
      accountId: f.bank.id,
      date: today,
    }).expect(201);
    await tx(auth, {
      type: 'expense',
      amount: 150_000,
      categoryId: f.food.id,
      accountId: f.bank.id,
      date: today,
    }).expect(201);

    const res = await request(app)
      .get(`/api/v1/dashboard/summary?month=${month}`)
      .set(auth)
      .expect(200);
    const s = res.body.data;
    expect(s.totals).toEqual({ income: 10_000_000, expense: 2_750_000, net: 7_250_000, count: 3 });
    expect(s.trend).toHaveLength(12);
    expect(s.trend[11]).toEqual({ month, income: 10_000_000, expense: 2_750_000 });
    expect(
      s.spendingByCategory.map((c: { category: { name: string } }) => c.category.name),
    ).toEqual(['Rent', 'Food & Dining']);
    expect(s.recent).toHaveLength(3);
    expect(s.netWorth).toBe(7_250_000);

    await request(app).get('/api/v1/dashboard/summary?month=2026-13').set(auth).expect(400);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_USER, currentMonthKey, todayIso } from '@fintrack/shared';
import { createDemoSource } from '../data/demo/source';
import { memoryStore } from '../data/demo/storage';
import type { DataSource } from '../data/types';
import { ApiError } from '../lib/errors';

describe('demo data source (in-browser backend)', () => {
  let source: DataSource;

  beforeEach(() => {
    source = createDemoSource({ store: memoryStore(), latency: 0 });
  });

  it('requires a session', async () => {
    await expect(source.accounts.list()).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('seeds a realistic demo account on one-click login', async () => {
    const { user } = await source.auth.demo();
    expect(user).toMatchObject({ email: DEMO_USER.email, isDemo: true });
    const page = await source.transactions.list({ limit: 10 });
    expect(page.meta.total).toBeGreaterThan(300);
    expect(page.data).toHaveLength(10);
    expect(await source.auth.restore()).toMatchObject({ email: DEMO_USER.email });
  });

  it('registers users with default categories and rejects duplicates', async () => {
    await source.auth.register({
      name: 'Neha Gupta',
      email: 'neha@example.com',
      password: 'Passw0rd1',
    });
    expect((await source.categories.list()).length).toBe(17);
    await source.auth.logout();
    await expect(
      source.auth.register({ name: 'Neha', email: 'NEHA@example.com', password: 'Passw0rd1' }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(
      source.auth.login({ email: 'neha@example.com', password: 'wrong-pass1' }),
    ).rejects.toMatchObject({ status: 401 });
    await source.auth.login({ email: 'neha@example.com', password: 'Passw0rd1' });
  });

  it('applies the same validation as the API', async () => {
    await source.auth.register({
      name: 'Neha Gupta',
      email: 'neha@example.com',
      password: 'Passw0rd1',
    });
    const [account] = await source.accounts.list();
    const food = (await source.categories.list()).find((c) => c.name === 'Food & Dining')!;
    const salary = (await source.categories.list()).find((c) => c.name === 'Salary')!;
    const base = {
      type: 'expense' as const,
      amount: 25_000,
      categoryId: food.id,
      accountId: account!.id,
      date: todayIso(),
    };

    const err = await source.transactions
      .create({ ...base, amount: 12.5 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ path: 'amount' })],
    });
    await expect(
      source.transactions.create({ ...base, categoryId: salary.id }),
    ).rejects.toMatchObject({ status: 400 });

    const created = await source.transactions.create({ ...base, tags: ['Friends', 'friends'] });
    expect(created).toMatchObject({
      amount: 25_000,
      tags: ['friends'],
      category: { name: 'Food & Dining' },
    });

    const [updatedAccount] = await source.accounts.list();
    expect(updatedAccount!.balance).toBe(-25_000);
    await expect(source.accounts.remove(account!.id)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('filters, searches, sorts and exports like the API', async () => {
    await source.auth.demo();
    const expenses = await source.transactions.list({ type: 'expense', limit: 100 });
    expect(expenses.data.every((t) => t.type === 'expense')).toBe(true);

    const swiggy = await source.transactions.list({ q: 'swiggy' });
    expect(swiggy.meta.total).toBeGreaterThan(0);
    expect(swiggy.data.every((t) => /swiggy/i.test(t.note) || t.tags.includes('swiggy'))).toBe(
      true,
    );

    const byAmount = await source.transactions.list({ sort: '-amount', limit: 3 });
    const amounts = byAmount.data.map((t) => t.amount);
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));

    const month = currentMonthKey();
    const { blob, fileName } = await source.transactions.exportCsv({ from: `${month}-01` });
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(fileName).toBe(`fintrack-transactions-${month}-01_to_today.csv`);
    expect(text).toContain('Date,Type,Amount (INR),Category,Account,Note,Tags');
  });

  it('computes budgets and the dashboard summary', async () => {
    await source.auth.demo();
    const month = currentMonthKey();
    const summary = await source.dashboard.summary(month);
    expect(summary.trend).toHaveLength(12);
    expect(summary.totals.net).toBe(summary.totals.income - summary.totals.expense);
    expect(summary.spendingByCategory[0]!.amount).toBeGreaterThanOrEqual(
      summary.spendingByCategory[1]!.amount,
    );

    const budgets = await source.budgets.list(month);
    expect(budgets.some((b) => b.state === 'over')).toBe(true);

    const shopping = budgets.find((b) => b.category.name === 'Shopping')!;
    const updated = await source.budgets.upsert(shopping.category.id, 10_00_000_00, month);
    expect(updated.state).toBe('ok');
  });
});

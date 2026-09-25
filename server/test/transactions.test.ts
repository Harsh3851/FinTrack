import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, fixtures, registerUser, resetDatabase, tx } from './helpers';

describe('transactions', () => {
  let auth: Record<string, string>;
  let f: Awaited<ReturnType<typeof fixtures>>;

  beforeEach(async () => {
    await resetDatabase();
    ({ auth } = await registerUser());
    f = await fixtures(auth);
  });

  const expense = (over: Record<string, unknown> = {}) => ({
    type: 'expense',
    amount: 45_050,
    categoryId: f.food.id,
    accountId: f.bank.id,
    date: '2026-09-12',
    note: 'Dinner with team',
    tags: ['Work', 'work', 'friends'],
    ...over,
  });

  it('creates, reads, updates and deletes a transaction', async () => {
    const created = await tx(auth, expense()).expect(201);
    const t = created.body.data;
    expect(t).toMatchObject({
      type: 'expense',
      amount: 45_050,
      date: '2026-09-12',
      tags: ['work', 'friends'],
      category: { id: f.food.id, name: 'Food & Dining' },
      account: { id: f.bank.id },
    });

    await request(app).get(`/api/v1/transactions/${t.id}`).set(auth).expect(200);

    const updated = await request(app)
      .patch(`/api/v1/transactions/${t.id}`)
      .set(auth)
      .send({ amount: 50_000, note: 'Dinner (split)' })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      amount: 50_000,
      note: 'Dinner (split)',
      date: '2026-09-12',
    });

    await request(app).delete(`/api/v1/transactions/${t.id}`).set(auth).expect(204);
    await request(app).get(`/api/v1/transactions/${t.id}`).set(auth).expect(404);
  });

  it('stores money as integer paise and rejects invalid amounts', async () => {
    for (const amount of [12.5, 0, -100, '100']) {
      const res = await tx(auth, expense({ amount })).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].path).toBe('amount');
    }
  });

  it('rejects invalid dates and ids', async () => {
    await tx(auth, expense({ date: '2026-02-30' })).expect(400);
    await tx(auth, expense({ categoryId: 'abc' })).expect(400);
    await request(app).get('/api/v1/transactions/not-an-id').set(auth).expect(400);
  });

  it('requires the category type to match the transaction type', async () => {
    const res = await tx(auth, expense({ categoryId: f.salary.id })).expect(400);
    expect(res.body.error.details[0].path).toBe('categoryId');

    const created = await tx(auth, expense()).expect(201);
    await request(app)
      .patch(`/api/v1/transactions/${created.body.data.id}`)
      .set(auth)
      .send({ type: 'income' })
      .expect(400);
  });

  it('isolates data between users', async () => {
    const mine = await tx(auth, expense()).expect(201);
    const other = await registerUser();
    const otherFixtures = await fixtures(other.auth);

    await request(app).get(`/api/v1/transactions/${mine.body.data.id}`).set(other.auth).expect(404);
    await request(app)
      .delete(`/api/v1/transactions/${mine.body.data.id}`)
      .set(other.auth)
      .expect(404);
    // Cannot book against someone else's account or category.
    await tx(
      other.auth,
      expense({ accountId: f.bank.id, categoryId: otherFixtures.food.id }),
    ).expect(404);
    await tx(other.auth, expense({ accountId: otherFixtures.bank.id })).expect(404);

    const list = await request(app).get('/api/v1/transactions').set(other.auth).expect(200);
    expect(list.body.meta.total).toBe(0);
  });

  describe('listing', () => {
    beforeEach(async () => {
      const rows = [
        expense({ amount: 30_000, date: '2026-07-05', note: 'Swiggy biryani', tags: ['swiggy'] }),
        expense({
          amount: 2_600_000,
          date: '2026-08-03',
          categoryId: f.rent.id,
          note: 'August rent',
          tags: [],
        }),
        expense({ amount: 12_000, date: '2026-08-20', note: 'Coffee', tags: [] }),
        {
          ...expense({ amount: 11_500_000, date: '2026-08-01', note: 'Salary', tags: [] }),
          type: 'income',
          categoryId: f.salary.id,
        },
        expense({ amount: 99_900, date: '2026-09-02', note: 'Movie night', tags: ['weekend'] }),
      ];
      for (const row of rows) await tx(auth, row).expect(201);
    });

    const list = (query: string) =>
      request(app).get(`/api/v1/transactions?${query}`).set(auth).expect(200);

    it('paginates newest first by default', async () => {
      const page1 = await list('limit=2');
      expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
      expect(page1.body.data.map((t: { date: string }) => t.date)).toEqual([
        '2026-09-02',
        '2026-08-20',
      ]);
      const page3 = await list('limit=2&page=3');
      expect(page3.body.data).toHaveLength(1);
      expect(page3.body.data[0].date).toBe('2026-07-05');
    });

    it('filters by type, category, account and date range', async () => {
      expect((await list('type=income')).body.meta.total).toBe(1);
      expect((await list(`categoryId=${f.food.id}`)).body.meta.total).toBe(3);
      expect((await list(`accountId=${f.bank.id}`)).body.meta.total).toBe(5);
      const august = await list('from=2026-08-01&to=2026-08-31');
      expect(august.body.meta.total).toBe(3);
      const bad = await request(app)
        .get('/api/v1/transactions?from=2026-09-01&to=2026-08-01')
        .set(auth)
        .expect(400);
      expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('searches notes, tags and category names case-insensitively', async () => {
      expect((await list('q=SWIGGY')).body.meta.total).toBe(1);
      expect((await list('q=weekend')).body.meta.total).toBe(1);
      expect((await list('q=rent')).body.meta.total).toBe(1);
      // Regex metacharacters are treated literally.
      expect((await list('q=.*')).body.meta.total).toBe(0);
    });

    it('sorts by amount', async () => {
      const desc = await list('sort=-amount&limit=1');
      expect(desc.body.data[0].amount).toBe(11_500_000);
      const asc = await list('sort=amount&limit=1');
      expect(asc.body.data[0].amount).toBe(12_000);
    });

    it('exports the filtered list as CSV', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/export?categoryId=${f.food.id}&from=2026-08-01`)
        .set(auth)
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(
        /fintrack-transactions-2026-08-01_to_today\.csv/,
      );
      const lines = res.text
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');
      expect(lines[0]).toBe('Date,Type,Amount (INR),Category,Account,Note,Tags');
      expect(lines).toHaveLength(3);
      expect(lines[1]).toBe(
        '02-09-2026,expense,999.00,Food & Dining,Bank Account,Movie night,weekend',
      );
    });
  });

  it('neutralises spreadsheet formulas in CSV export', async () => {
    await tx(auth, expense({ note: '=HYPERLINK("http://x")' })).expect(201);
    const res = await request(app).get('/api/v1/transactions/export').set(auth).expect(200);
    expect(res.text).toContain(`"'=HYPERLINK(""http://x"")"`);
  });
});

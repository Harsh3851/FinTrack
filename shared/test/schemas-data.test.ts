import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  budgetState,
  csvCell,
  generateDemoData,
  transactionInputSchema,
  transactionQuerySchema,
} from '../src';

const id = 'a'.repeat(24);

describe('schemas', () => {
  it('normalises transaction input', () => {
    const parsed = transactionInputSchema.parse({
      type: 'expense',
      amount: 1000,
      categoryId: id,
      accountId: id,
      date: '2026-09-01',
      tags: [' Food ', 'food', 'Weekend'],
    });
    expect(parsed.note).toBe('');
    expect(parsed.tags).toEqual(['food', 'weekend']);
  });

  it('coerces and defaults list queries', () => {
    expect(transactionQuerySchema.parse({ page: '2', type: '' })).toMatchObject({
      page: 2,
      limit: 20,
      sort: '-date',
      type: undefined,
    });
    expect(() => transactionQuerySchema.parse({ limit: '500' })).toThrow();
  });
});

describe('budgets and csv', () => {
  it('classifies budget progress', () => {
    expect(budgetState(500, 1000)).toBe('ok');
    expect(budgetState(800, 1000)).toBe('warning');
    expect(budgetState(1000, 1000)).toBe('warning');
    expect(budgetState(1001, 1000)).toBe('over');
  });

  it('escapes CSV cells and blocks formula injection', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
  });
});

describe('demo data', () => {
  const now = new Date('2026-09-25T09:00:00Z');
  const data = generateDemoData(now);

  it('is deterministic and never in the future', () => {
    expect(generateDemoData(now)).toEqual(data);
    expect(data.transactions.every((t) => t.date <= '2026-09-25')).toBe(true);
    expect(data.transactions.length).toBeGreaterThan(300);
  });

  it('only references known categories and accounts with matching types', () => {
    const categories = new Map(DEFAULT_CATEGORIES.map((c) => [c.key, c]));
    const accounts = new Set(data.accounts.map((a) => a.key));
    for (const t of data.transactions) {
      expect(categories.get(t.categoryKey)?.type).toBe(t.type);
      expect(accounts.has(t.accountKey)).toBe(true);
      expect(Number.isInteger(t.amount) && t.amount > 0).toBe(true);
    }
  });

  it('covers twelve months', () => {
    const months = new Set(data.transactions.map((t) => t.date.slice(0, 7)));
    expect(months.size).toBe(12);
  });
});

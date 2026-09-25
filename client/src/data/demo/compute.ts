import {
  budgetFigures,
  monthBounds,
  monthsEndingAt,
  shiftMonth,
  type Account,
  type BudgetStatus,
  type Category,
  type CategoryRef,
  type DashboardSummary,
  type MonthTotals,
  type Transaction,
  type TransactionQuery,
} from '@fintrack/shared';
import type { UserData } from './db';

/** Pure read-model functions used by the in-browser demo backend. */

export function categoryRef(data: UserData, id: string): CategoryRef {
  const c = data.categories.find((x) => x.id === id);
  return c
    ? { id: c.id, name: c.name, icon: c.icon, color: c.color }
    : { id: '', name: 'Uncategorised', icon: 'tag', color: '#64748b' };
}

export function hydrateTransaction(
  data: UserData,
  t: UserData['transactions'][number],
): Transaction {
  const a = data.accounts.find((x) => x.id === t.accountId);
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    date: t.date,
    note: t.note,
    tags: t.tags,
    category: categoryRef(data, t.categoryId),
    account: a
      ? { id: a.id, name: a.name, type: a.type }
      : { id: '', name: 'Unknown account', type: 'bank' },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function accountsWithBalances(data: UserData): Account[] {
  return data.accounts.map((a) => {
    let balance = a.openingBalance;
    let count = 0;
    for (const t of data.transactions) {
      if (t.accountId !== a.id) continue;
      balance += t.type === 'income' ? t.amount : -t.amount;
      count += 1;
    }
    return { ...a, balance, transactionCount: count };
  });
}

export function categoriesWithCounts(data: UserData): Category[] {
  const counts = new Map<string, number>();
  for (const t of data.transactions) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  return [...data.categories]
    .sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'income' ? 1 : -1,
    )
    .map((c) => ({ ...c, transactionCount: counts.get(c.id) ?? 0 }));
}

export function filterTransactions(data: UserData, q: Omit<TransactionQuery, 'page' | 'limit'>) {
  const needle = q.q?.toLowerCase();
  const matchingCategories = needle
    ? new Set(data.categories.filter((c) => c.name.toLowerCase().includes(needle)).map((c) => c.id))
    : null;
  const rows = data.transactions.filter(
    (t) =>
      (!q.type || t.type === q.type) &&
      (!q.categoryId || t.categoryId === q.categoryId) &&
      (!q.accountId || t.accountId === q.accountId) &&
      (!q.from || t.date >= q.from) &&
      (!q.to || t.date <= q.to) &&
      (!needle ||
        t.note.toLowerCase().includes(needle) ||
        t.tags.some((tag) => tag.includes(needle)) ||
        matchingCategories!.has(t.categoryId)),
  );
  const byDate = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date);
  const sorters: Record<
    TransactionQuery['sort'],
    (a: (typeof rows)[number], b: (typeof rows)[number]) => number
  > = {
    '-date': byDate,
    date: (a, b) => -byDate(a, b),
    '-amount': (a, b) => b.amount - a.amount || byDate(a, b),
    amount: (a, b) => a.amount - b.amount || byDate(a, b),
  };
  return rows.sort(sorters[q.sort]);
}

function expensesByCategory(data: UserData, month: string) {
  const { from, to } = monthBounds(month);
  const totals = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.type !== 'expense' || t.date < from || t.date > to) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  return totals;
}

export function budgetStatuses(data: UserData, month: string): BudgetStatus[] {
  const spent = expensesByCategory(data, month);
  return data.budgets
    .filter((b) => data.categories.some((c) => c.id === b.categoryId))
    .map((b) => ({
      id: b.id,
      category: categoryRef(data, b.categoryId),
      amount: b.amount,
      ...budgetFigures(spent.get(b.categoryId) ?? 0, b.amount),
    }))
    .sort((a, b) => b.ratio - a.ratio);
}

export function dashboardSummary(data: UserData, month: string): DashboardSummary {
  const months = monthsEndingAt(month, 12);
  const totals = new Map<string, MonthTotals>();
  for (const m of [shiftMonth(months[0]!, -1), ...months])
    totals.set(m, { income: 0, expense: 0, net: 0, count: 0 });
  for (const t of data.transactions) {
    const bucket = totals.get(t.date.slice(0, 7));
    if (!bucket) continue;
    bucket[t.type] += t.amount;
    bucket.count += 1;
  }
  for (const b of totals.values()) b.net = b.income - b.expense;

  const spending = expensesByCategory(data, month);
  const monthEnd = monthBounds(month).to;
  const empty: MonthTotals = { income: 0, expense: 0, net: 0, count: 0 };

  return {
    month,
    totals: totals.get(month) ?? empty,
    previousTotals: totals.get(shiftMonth(month, -1)) ?? empty,
    trend: months.map((m) => ({
      month: m,
      income: totals.get(m)!.income,
      expense: totals.get(m)!.expense,
    })),
    spendingByCategory: [...spending.entries()]
      .map(([id, amount]) => ({ category: categoryRef(data, id), amount }))
      .sort((a, b) => b.amount - a.amount),
    recent: filterTransactions(data, { sort: '-date', to: monthEnd })
      .slice(0, 6)
      .map((t) => hydrateTransaction(data, t)),
    budgets: budgetStatuses(data, month),
    netWorth: accountsWithBalances(data).reduce((s, a) => s + a.balance, 0),
  };
}

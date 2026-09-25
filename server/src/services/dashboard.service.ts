import { Types } from 'mongoose';
import {
  isoDateToUtc,
  monthBounds,
  monthsEndingAt,
  shiftMonth,
  type DashboardSummary,
  type MonthTotals,
} from '@fintrack/shared';
import { CategoryModel, TransactionModel } from '../models';
import { toCategoryRef, toTransactionDto, type PopulatedTransaction } from '../utils/serialize';
import { listAccounts } from './account.service';
import { expensesByCategory, listBudgets } from './budget.service';

const TREND_MONTHS = 12;
const RECENT_COUNT = 6;

async function monthlyFlows(user: Types.ObjectId, months: string[]) {
  const from = monthBounds(months[0]!).from;
  const to = monthBounds(months[months.length - 1]!).to;
  const rows = await TransactionModel.aggregate<{
    _id: { month: string; type: 'income' | 'expense' };
    total: number;
    count: number;
  }>([
    { $match: { user, date: { $gte: isoDateToUtc(from), $lte: isoDateToUtc(to) } } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const byMonth = new Map<string, MonthTotals>(
    months.map((m) => [m, { income: 0, expense: 0, net: 0, count: 0 }]),
  );
  for (const row of rows) {
    const totals = byMonth.get(row._id.month);
    if (!totals) continue;
    totals[row._id.type] += row.total;
    totals.count += row.count;
  }
  for (const totals of byMonth.values()) totals.net = totals.income - totals.expense;
  return byMonth;
}

export async function getSummary(userId: string, month: string): Promise<DashboardSummary> {
  const user = new Types.ObjectId(userId);
  // One extra month so the first trend month also has a previous-month comparison.
  const months = monthsEndingAt(month, TREND_MONTHS);
  const [flows, spending, categories, recentRows, budgets, accounts] = await Promise.all([
    monthlyFlows(user, [shiftMonth(months[0]!, -1), ...months]),
    expensesByCategory(user, month),
    CategoryModel.find({ user, type: 'expense' }).lean(),
    TransactionModel.find({ user, date: { $lte: isoDateToUtc(monthBounds(month).to) } })
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .limit(RECENT_COUNT)
      .populate([
        { path: 'category', select: 'name icon color' },
        { path: 'account', select: 'name type' },
      ])
      .lean<PopulatedTransaction[]>(),
    listBudgets(userId, month),
    listAccounts(userId),
  ]);

  const empty: MonthTotals = { income: 0, expense: 0, net: 0, count: 0 };
  const spendingByCategory = categories
    .map((c) => ({ category: toCategoryRef(c), amount: spending.get(String(c._id)) ?? 0 }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    month,
    totals: flows.get(month) ?? empty,
    previousTotals: flows.get(shiftMonth(month, -1)) ?? empty,
    trend: months.map((m) => {
      const t = flows.get(m) ?? empty;
      return { month: m, income: t.income, expense: t.expense };
    }),
    spendingByCategory,
    recent: recentRows.map(toTransactionDto),
    budgets,
    netWorth: accounts.reduce((sum, a) => sum + a.balance, 0),
  };
}

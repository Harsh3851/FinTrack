import { Types } from 'mongoose';
import {
  budgetFigures,
  currentMonthKey,
  isoDateToUtc,
  monthBounds,
  type BudgetStatus,
} from '@fintrack/shared';
import { BudgetModel, TransactionModel } from '../models';
import { badRequest, notFound } from '../utils/app-error';
import { toCategoryRef } from '../utils/serialize';
import { getOwnedCategory } from './category.service';

interface BudgetRow {
  _id: Types.ObjectId;
  amount: number;
  category: { _id: Types.ObjectId; name: string; icon: string; color: string } | null;
}

/** Spending per expense category within one calendar month. */
export async function expensesByCategory(user: Types.ObjectId, month: string) {
  const { from, to } = monthBounds(month);
  const rows = await TransactionModel.aggregate<{ _id: Types.ObjectId; total: number }>([
    {
      $match: {
        user,
        type: 'expense',
        date: { $gte: isoDateToUtc(from), $lte: isoDateToUtc(to) },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.total]));
}

export async function listBudgets(
  userId: string,
  month = currentMonthKey(),
): Promise<BudgetStatus[]> {
  const user = new Types.ObjectId(userId);
  const [budgets, spent] = await Promise.all([
    BudgetModel.find({ user }).populate('category', 'name icon color').lean<BudgetRow[]>(),
    expensesByCategory(user, month),
  ]);
  return budgets
    .filter((b) => b.category)
    .map((b) => {
      const category = b.category!;
      return {
        id: String(b._id),
        category: toCategoryRef(category),
        amount: b.amount,
        ...budgetFigures(spent.get(String(category._id)) ?? 0, b.amount),
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export async function upsertBudget(
  userId: string,
  categoryId: string,
  amount: number,
  month?: string,
) {
  const category = await getOwnedCategory(userId, categoryId);
  if (category.type !== 'expense') {
    throw badRequest('Budgets can only be set on expense categories');
  }
  await BudgetModel.findOneAndUpdate(
    { user: userId, category: categoryId },
    { amount },
    { upsert: true, new: true, runValidators: true },
  );
  const budgets = await listBudgets(userId, month);
  return budgets.find((b) => b.category.id === categoryId)!;
}

export async function deleteBudget(userId: string, categoryId: string): Promise<void> {
  const result = await BudgetModel.deleteOne({ user: userId, category: categoryId });
  if (result.deletedCount === 0) throw notFound('Budget');
}

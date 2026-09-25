import { Types } from 'mongoose';
import { DEFAULT_CATEGORIES, generateDemoData, isoDateToUtc } from '@fintrack/shared';
import { AccountModel, BudgetModel, CategoryModel, TransactionModel } from '../models';

/** Every new user starts with a sensible category set and one bank account. */
export async function seedDefaultsForUser(userId: string): Promise<void> {
  const user = new Types.ObjectId(userId);
  await CategoryModel.insertMany(
    DEFAULT_CATEGORIES.map(({ name, type, icon, color }) => ({ user, name, type, icon, color })),
  );
  await AccountModel.create({
    user,
    name: 'Bank Account',
    type: 'bank',
    openingBalance: 0,
    color: '#2a78d6',
  });
}

/** Replaces a user's data with twelve months of realistic demo activity. */
export async function seedDemoDataForUser(
  userId: string,
  now = new Date(),
): Promise<{ transactions: number }> {
  const user = new Types.ObjectId(userId);
  await Promise.all([
    TransactionModel.deleteMany({ user }),
    BudgetModel.deleteMany({ user }),
    CategoryModel.deleteMany({ user }),
    AccountModel.deleteMany({ user }),
  ]);

  const data = generateDemoData(now);
  const accountIds = new Map<string, Types.ObjectId>();
  const categoryIds = new Map<string, Types.ObjectId>();

  const accounts = await AccountModel.insertMany(
    data.accounts.map(({ name, type, openingBalance, color }) => ({
      user,
      name,
      type,
      openingBalance,
      color,
    })),
  );
  data.accounts.forEach((a, i) => accountIds.set(a.key, accounts[i]!._id));

  const categories = await CategoryModel.insertMany(
    data.categories.map(({ name, type, icon, color }) => ({ user, name, type, icon, color })),
  );
  data.categories.forEach((c, i) => categoryIds.set(c.key, categories[i]!._id));

  await BudgetModel.insertMany(
    data.budgets.map((b) => ({ user, category: categoryIds.get(b.categoryKey), amount: b.amount })),
  );

  await TransactionModel.insertMany(
    data.transactions.map((t) => ({
      user,
      type: t.type,
      amount: t.amount,
      category: categoryIds.get(t.categoryKey),
      account: accountIds.get(t.accountKey),
      date: isoDateToUtc(t.date),
      note: t.note,
      tags: t.tags,
    })),
  );
  return { transactions: data.transactions.length };
}

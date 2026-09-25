import { Types, type FilterQuery, type SortOrder } from 'mongoose';
import {
  isoDateToUtc,
  type Paginated,
  type Transaction,
  type TransactionInput,
  type TransactionQuery,
  type TransactionUpdate,
} from '@fintrack/shared';
import { CategoryModel, TransactionModel } from '../models';
import type { TransactionRecord } from '../models/transaction.model';
import { notFound } from '../utils/app-error';
import { escapeRegex } from '../utils/regex';
import { toTransactionDto, type PopulatedTransaction } from '../utils/serialize';
import { assertAccountOwned } from './account.service';
import { assertCategoryMatchesType } from './category.service';

export const EXPORT_ROW_LIMIT = 10_000;

const SORTS: Record<TransactionQuery['sort'], Record<string, SortOrder>> = {
  '-date': { date: -1, createdAt: -1, _id: -1 },
  date: { date: 1, createdAt: 1, _id: 1 },
  '-amount': { amount: -1, date: -1, _id: -1 },
  amount: { amount: 1, date: -1, _id: -1 },
};

const POPULATE = [
  { path: 'category', select: 'name icon color' },
  { path: 'account', select: 'name type' },
];

async function buildFilter(userId: string, q: Omit<TransactionQuery, 'page' | 'limit' | 'sort'>) {
  const user = new Types.ObjectId(userId);
  const filter: FilterQuery<TransactionRecord> = { user };
  if (q.type) filter.type = q.type;
  if (q.categoryId) filter.category = new Types.ObjectId(q.categoryId);
  if (q.accountId) filter.account = new Types.ObjectId(q.accountId);
  if (q.from || q.to) {
    filter.date = {
      ...(q.from ? { $gte: isoDateToUtc(q.from) } : {}),
      ...(q.to ? { $lte: isoDateToUtc(q.to) } : {}),
    };
  }
  if (q.q) {
    const pattern = new RegExp(escapeRegex(q.q), 'i');
    const matchingCategories = await CategoryModel.find({ user, name: pattern }).distinct('_id');
    filter.$or = [{ note: pattern }, { tags: pattern }, { category: { $in: matchingCategories } }];
  }
  return filter;
}

export async function listTransactions(
  userId: string,
  query: TransactionQuery,
): Promise<Paginated<Transaction>> {
  const { page, limit, sort, ...filters } = query;
  const filter = await buildFilter(userId, filters);
  const [total, rows] = await Promise.all([
    TransactionModel.countDocuments(filter),
    TransactionModel.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE)
      .lean<PopulatedTransaction[]>(),
  ]);
  return {
    data: rows.map(toTransactionDto),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function exportTransactions(
  userId: string,
  query: Omit<TransactionQuery, 'page' | 'limit'>,
): Promise<Transaction[]> {
  const { sort, ...filters } = query;
  const filter = await buildFilter(userId, filters);
  const rows = await TransactionModel.find(filter)
    .sort(SORTS[sort])
    .limit(EXPORT_ROW_LIMIT)
    .populate(POPULATE)
    .lean<PopulatedTransaction[]>();
  return rows.map(toTransactionDto);
}

export async function getTransaction(userId: string, id: string): Promise<Transaction> {
  const row = await TransactionModel.findOne({ _id: id, user: userId })
    .populate(POPULATE)
    .lean<PopulatedTransaction>();
  if (!row) throw notFound('Transaction');
  return toTransactionDto(row);
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
): Promise<Transaction> {
  await Promise.all([
    assertCategoryMatchesType(userId, input.categoryId, input.type),
    assertAccountOwned(userId, input.accountId),
  ]);
  const doc = await TransactionModel.create({
    user: userId,
    type: input.type,
    amount: input.amount,
    category: input.categoryId,
    account: input.accountId,
    date: isoDateToUtc(input.date),
    note: input.note,
    tags: input.tags,
  });
  return getTransaction(userId, String(doc._id));
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionUpdate,
): Promise<Transaction> {
  const existing = await TransactionModel.findOne({ _id: id, user: userId });
  if (!existing) throw notFound('Transaction');

  const type = input.type ?? existing.type;
  const categoryId = input.categoryId ?? String(existing.category);
  // Changing the type or the category must keep the pair consistent.
  if (input.type || input.categoryId) await assertCategoryMatchesType(userId, categoryId, type);
  if (input.accountId) await assertAccountOwned(userId, input.accountId);

  existing.set({
    type,
    category: categoryId,
    ...(input.amount !== undefined && { amount: input.amount }),
    ...(input.accountId && { account: input.accountId }),
    ...(input.date && { date: isoDateToUtc(input.date) }),
    ...(input.note !== undefined && { note: input.note }),
    ...(input.tags !== undefined && { tags: input.tags }),
  });
  await existing.save();
  return getTransaction(userId, id);
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const result = await TransactionModel.deleteOne({ _id: id, user: userId });
  if (result.deletedCount === 0) throw notFound('Transaction');
}

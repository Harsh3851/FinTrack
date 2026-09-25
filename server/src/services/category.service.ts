import { Types } from 'mongoose';
import type { Category, CategoryInput, CategoryUpdate, TransactionType } from '@fintrack/shared';
import { BudgetModel, CategoryModel, TransactionModel } from '../models';
import { badRequest, conflict, notFound } from '../utils/app-error';

type CategoryDoc = {
  _id: Types.ObjectId;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  createdAt: Date;
};

function toDto(c: CategoryDoc, count = 0): Category {
  return {
    id: String(c._id),
    name: c.name,
    type: c.type,
    icon: c.icon as Category['icon'],
    color: c.color,
    transactionCount: count,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function listCategories(userId: string): Promise<Category[]> {
  const user = new Types.ObjectId(userId);
  const [categories, counts] = await Promise.all([
    CategoryModel.find({ user })
      .sort({ type: -1, name: 1 })
      .collation({ locale: 'en' })
      .lean<CategoryDoc[]>(),
    TransactionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { user } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.count]));
  return categories.map((c) => toDto(c, byId.get(String(c._id))));
}

export async function createCategory(userId: string, input: CategoryInput): Promise<Category> {
  const doc = await CategoryModel.create({ ...input, user: userId });
  return toDto(doc.toObject() as CategoryDoc);
}

export async function updateCategory(
  userId: string,
  id: string,
  input: CategoryUpdate,
): Promise<Category> {
  const doc = await CategoryModel.findOneAndUpdate({ _id: id, user: userId }, input, {
    new: true,
    runValidators: true,
  }).lean<CategoryDoc>();
  if (!doc) throw notFound('Category');
  const count = await TransactionModel.countDocuments({ user: userId, category: id });
  return toDto(doc, count);
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  const category = await CategoryModel.findOne({ _id: id, user: userId });
  if (!category) throw notFound('Category');
  const used = await TransactionModel.countDocuments({ user: userId, category: id });
  if (used > 0) {
    throw conflict(
      `This category is used by ${used} transaction(s). Recategorise them before deleting it.`,
    );
  }
  await Promise.all([category.deleteOne(), BudgetModel.deleteOne({ user: userId, category: id })]);
}

export async function getOwnedCategory(userId: string, id: string) {
  const category = await CategoryModel.findOne({ _id: id, user: userId }).lean<CategoryDoc>();
  if (!category) throw notFound('Category');
  return category;
}

export async function assertCategoryMatchesType(userId: string, id: string, type: TransactionType) {
  const category = await getOwnedCategory(userId, id);
  if (category.type !== type) {
    throw badRequest(`"${category.name}" is an ${category.type} category`, [
      { path: 'categoryId', message: `Pick an ${type} category` },
    ]);
  }
  return category;
}

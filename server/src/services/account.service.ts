import { Types } from 'mongoose';
import type { Account, AccountInput, AccountUpdate } from '@fintrack/shared';
import { AccountModel, TransactionModel } from '../models';
import { conflict, notFound } from '../utils/app-error';

interface AccountFlow {
  _id: Types.ObjectId;
  income: number;
  expense: number;
  count: number;
}

async function flowsByAccount(user: Types.ObjectId, accountIds?: Types.ObjectId[]) {
  const rows = await TransactionModel.aggregate<AccountFlow>([
    { $match: { user, ...(accountIds ? { account: { $in: accountIds } } : {}) } },
    {
      $group: {
        _id: '$account',
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        count: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

type AccountDoc = {
  _id: Types.ObjectId;
  name: string;
  type: string;
  color: string;
  openingBalance: number;
  createdAt: Date;
};

function toDto(a: AccountDoc, flow?: AccountFlow): Account {
  return {
    id: String(a._id),
    name: a.name,
    type: a.type as Account['type'],
    color: a.color,
    openingBalance: a.openingBalance,
    balance: a.openingBalance + (flow?.income ?? 0) - (flow?.expense ?? 0),
    transactionCount: flow?.count ?? 0,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function listAccounts(userId: string): Promise<Account[]> {
  const user = new Types.ObjectId(userId);
  const [accounts, flows] = await Promise.all([
    AccountModel.find({ user }).sort({ createdAt: 1 }).lean<AccountDoc[]>(),
    flowsByAccount(user),
  ]);
  return accounts.map((a) => toDto(a, flows.get(String(a._id))));
}

async function getAccount(userId: string, id: string): Promise<Account> {
  const user = new Types.ObjectId(userId);
  const account = await AccountModel.findOne({ _id: id, user }).lean<AccountDoc>();
  if (!account) throw notFound('Account');
  const flows = await flowsByAccount(user, [account._id]);
  return toDto(account, flows.get(String(account._id)));
}

export async function createAccount(userId: string, input: AccountInput): Promise<Account> {
  const doc = await AccountModel.create({ ...input, user: userId });
  return toDto(doc.toObject() as AccountDoc);
}

export async function updateAccount(
  userId: string,
  id: string,
  input: AccountUpdate,
): Promise<Account> {
  const updated = await AccountModel.findOneAndUpdate({ _id: id, user: userId }, input, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw notFound('Account');
  return getAccount(userId, id);
}

export async function deleteAccount(userId: string, id: string): Promise<void> {
  const account = await AccountModel.findOne({ _id: id, user: userId });
  if (!account) throw notFound('Account');
  const used = await TransactionModel.countDocuments({ user: userId, account: id });
  if (used > 0) {
    throw conflict(
      `This account has ${used} transaction(s). Delete or move them before removing the account.`,
    );
  }
  await account.deleteOne();
}

export async function assertAccountOwned(userId: string, id: string) {
  const exists = await AccountModel.exists({ _id: id, user: userId });
  if (!exists) throw notFound('Account');
}

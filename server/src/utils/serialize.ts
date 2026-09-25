import type { Types } from 'mongoose';
import type { AccountRef, CategoryRef, Transaction, User } from '@fintrack/shared';
import { utcToIsoDate } from '@fintrack/shared';

type Id = Types.ObjectId | string;

export interface PopulatedTransaction {
  _id: Id;
  type: Transaction['type'];
  amount: number;
  date: Date;
  note?: string | null;
  tags?: string[] | null;
  category: { _id: Id; name: string; icon: string; color: string } | null;
  account: { _id: Id; name: string; type: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export const toCategoryRef = (c: {
  _id: Id;
  name: string;
  icon: string;
  color: string;
}): CategoryRef => ({
  id: String(c._id),
  name: c.name,
  icon: c.icon as CategoryRef['icon'],
  color: c.color,
});

const toAccountRef = (a: { _id: Id; name: string; type: string }): AccountRef => ({
  id: String(a._id),
  name: a.name,
  type: a.type as AccountRef['type'],
});

const MISSING_CATEGORY: CategoryRef = {
  id: '',
  name: 'Uncategorised',
  icon: 'tag',
  color: '#64748b',
};
const MISSING_ACCOUNT: AccountRef = { id: '', name: 'Unknown account', type: 'bank' };

export function toTransactionDto(t: PopulatedTransaction): Transaction {
  return {
    id: String(t._id),
    type: t.type,
    amount: t.amount,
    date: utcToIsoDate(t.date),
    note: t.note ?? '',
    tags: t.tags ?? [],
    category: t.category ? toCategoryRef(t.category) : MISSING_CATEGORY,
    account: t.account ? toAccountRef(t.account) : MISSING_ACCOUNT,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toUserDto(u: {
  _id: Id;
  name: string;
  email: string;
  isDemo?: boolean | null;
  createdAt: Date;
}): User {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    isDemo: Boolean(u.isDemo),
    createdAt: u.createdAt.toISOString(),
  };
}

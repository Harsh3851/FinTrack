import {
  DEFAULT_CATEGORIES,
  generateDemoData,
  type AccountType,
  type CategoryIcon,
  type TransactionType,
} from '@fintrack/shared';
import type { KeyValueStore } from './storage';

export interface AccountRow {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  createdAt: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  type: TransactionType;
  icon: CategoryIcon;
  color: string;
  createdAt: string;
}

export interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRow {
  id: string;
  categoryId: string;
  amount: number;
}

export interface UserData {
  accounts: AccountRow[];
  categories: CategoryRow[];
  transactions: TransactionRow[];
  budgets: BudgetRow[];
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  isDemo: boolean;
  createdAt: string;
}

export interface DemoDb {
  version: 1;
  users: UserRow[];
  sessionUserId: string | null;
  data: Record<string, UserData>;
}

export const STORAGE_KEY = 'fintrack:demo-db:v1';

/** 24-hex ids, the same shape as MongoDB ObjectIds, so the shared validators apply unchanged. */
export function newId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function emptyDb(): DemoDb {
  return { version: 1, users: [], sessionUserId: null, data: {} };
}

export function loadDb(store: KeyValueStore): DemoDb {
  const raw = store.get(STORAGE_KEY);
  if (!raw) return emptyDb();
  try {
    const parsed = JSON.parse(raw) as DemoDb;
    return parsed?.version === 1 && Array.isArray(parsed.users) ? parsed : emptyDb();
  } catch {
    return emptyDb();
  }
}

export function saveDb(store: KeyValueStore, db: DemoDb) {
  store.set(STORAGE_KEY, JSON.stringify(db));
}

export function defaultUserData(now = new Date()): UserData {
  const createdAt = now.toISOString();
  return {
    accounts: [
      {
        id: newId(),
        name: 'Bank Account',
        type: 'bank',
        openingBalance: 0,
        color: '#2a78d6',
        createdAt,
      },
    ],
    categories: DEFAULT_CATEGORIES.map(({ name, type, icon, color }) => ({
      id: newId(),
      name,
      type,
      icon,
      color,
      createdAt,
    })),
    transactions: [],
    budgets: [],
  };
}

export function demoUserData(now = new Date()): UserData {
  const data = generateDemoData(now);
  const createdAt = now.toISOString();
  const accountIds = new Map(data.accounts.map((a) => [a.key, newId()]));
  const categoryIds = new Map(data.categories.map((c) => [c.key, newId()]));
  return {
    accounts: data.accounts.map((a) => ({
      id: accountIds.get(a.key)!,
      name: a.name,
      type: a.type,
      openingBalance: a.openingBalance,
      color: a.color,
      createdAt,
    })),
    categories: data.categories.map((c) => ({
      id: categoryIds.get(c.key)!,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      createdAt,
    })),
    transactions: data.transactions.map((t, i) => {
      // Stable ordering for same-day rows: later index = older.
      const stamp = new Date(`${t.date}T12:00:00.000Z`).getTime() - i;
      const iso = new Date(stamp).toISOString();
      return {
        id: newId(),
        type: t.type,
        amount: t.amount,
        categoryId: categoryIds.get(t.categoryKey)!,
        accountId: accountIds.get(t.accountKey)!,
        date: t.date,
        note: t.note,
        tags: t.tags,
        createdAt: iso,
        updatedAt: iso,
      };
    }),
    budgets: data.budgets.map((b) => ({
      id: newId(),
      categoryId: categoryIds.get(b.categoryKey)!,
      amount: b.amount,
    })),
  };
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

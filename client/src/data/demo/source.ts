import { ZodError, type ZodTypeAny, type z } from 'zod';
import {
  DEMO_USER,
  accountInputSchema,
  accountUpdateSchema,
  budgetInputSchema,
  categoryInputSchema,
  categoryUpdateSchema,
  csvFileName,
  idSchema,
  loginSchema,
  monthKeySchema,
  registerSchema,
  transactionInputSchema,
  transactionQuerySchema,
  transactionsToCsv,
  transactionUpdateSchema,
  type AuthResponse,
  type TransactionType,
  type User,
} from '@fintrack/shared';
import { ApiError } from '../../lib/errors';
import type { DataSource } from '../types';
import {
  accountsWithBalances,
  budgetStatuses,
  categoriesWithCounts,
  dashboardSummary,
  filterTransactions,
  hydrateTransaction,
} from './compute';
import {
  defaultUserData,
  demoUserData,
  hashPassword,
  loadDb,
  newId,
  saveDb,
  type DemoDb,
  type UserData,
  type UserRow,
} from './db';
import { browserStore, type KeyValueStore } from './storage';

export interface DemoSourceOptions {
  store?: KeyValueStore;
  /** Simulated network latency in ms, so loading states are exercised. */
  latency?: number;
  now?: () => Date;
}

const conflict = (message: string) => new ApiError(409, 'CONFLICT', message);
const notFound = (what: string) => new ApiError(404, 'NOT_FOUND', `${what} not found`);

/** Same validation as the API: shared zod schemas, same error shape. */
function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Some fields are invalid',
        err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    throw err;
  }
}

const sameName = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' }) === 0;

export function createDemoSource(options: DemoSourceOptions = {}): DataSource {
  const store = options.store ?? browserStore();
  const latency = options.latency ?? 140;
  const now = options.now ?? (() => new Date());

  const wait = () =>
    latency > 0
      ? new Promise((r) => setTimeout(r, latency * (0.6 + Math.random() * 0.8)))
      : Promise.resolve();

  /** Runs `fn` against a fresh copy of the database and persists it if it returns. */
  async function tx<T>(fn: (db: DemoDb) => T | Promise<T>, write = false): Promise<T> {
    await wait();
    const db = loadDb(store);
    const result = await fn(db);
    if (write) saveDb(store, db);
    return structuredClone(result);
  }

  function userData(db: DemoDb): { user: UserRow; data: UserData } {
    const user = db.users.find((u) => u.id === db.sessionUserId);
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please sign in again.');
    db.data[user.id] ??= defaultUserData(now());
    return { user, data: db.data[user.id]! };
  }

  const toUser = (u: UserRow): User => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isDemo: u.isDemo,
    createdAt: u.createdAt,
  });
  const session = (db: DemoDb, u: UserRow): AuthResponse => {
    db.sessionUserId = u.id;
    return { user: toUser(u), accessToken: 'demo', expiresIn: 3600 };
  };

  async function ensureDemoUser(db: DemoDb): Promise<UserRow> {
    let user = db.users.find((u) => u.email === DEMO_USER.email);
    if (!user) {
      const salt = newId();
      user = {
        id: newId(),
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        salt,
        passwordHash: await hashPassword(DEMO_USER.password, salt),
        isDemo: true,
        createdAt: now().toISOString(),
      };
      db.users.push(user);
      db.data[user.id] = demoUserData(now());
    }
    return user;
  }

  function assertCategory(data: UserData, id: string, type: TransactionType) {
    const category = data.categories.find((c) => c.id === id);
    if (!category) throw notFound('Category');
    if (category.type !== type) {
      throw new ApiError(400, 'BAD_REQUEST', `"${category.name}" is an ${category.type} category`, [
        { path: 'categoryId', message: `Pick an ${type} category` },
      ]);
    }
  }
  function assertAccount(data: UserData, id: string) {
    if (!data.accounts.some((a) => a.id === id)) throw notFound('Account');
  }
  const parseId = (id: string) => parse(idSchema, id);

  return {
    mode: 'demo',

    auth: {
      register: (input) =>
        tx(async (db) => {
          const body = parse(registerSchema, input);
          if (db.users.some((u) => u.email === body.email))
            throw conflict('An account with this email already exists');
          const salt = newId();
          const user: UserRow = {
            id: newId(),
            name: body.name,
            email: body.email,
            salt,
            passwordHash: await hashPassword(body.password, salt),
            isDemo: false,
            createdAt: now().toISOString(),
          };
          db.users.push(user);
          db.data[user.id] = defaultUserData(now());
          return session(db, user);
        }, true),

      login: (input) =>
        tx(async (db) => {
          const body = parse(loginSchema, input);
          if (body.email === DEMO_USER.email) await ensureDemoUser(db);
          const user = db.users.find((u) => u.email === body.email);
          const ok = user && (await hashPassword(body.password, user.salt)) === user.passwordHash;
          if (!user || !ok) throw new ApiError(401, 'UNAUTHORIZED', 'Incorrect email or password');
          return session(db, user);
        }, true),

      demo: () => tx(async (db) => session(db, await ensureDemoUser(db)), true),

      restore: () =>
        tx((db) => {
          const user = db.users.find((u) => u.id === db.sessionUserId);
          return user ? toUser(user) : null;
        }),

      logout: () =>
        tx((db) => {
          db.sessionUserId = null;
        }, true),
    },

    accounts: {
      list: () => tx((db) => accountsWithBalances(userData(db).data)),
      create: (input) =>
        tx((db) => {
          const { data } = userData(db);
          const body = parse(accountInputSchema, input);
          if (data.accounts.some((a) => sameName(a.name, body.name)))
            throw conflict('A record with the same name already exists');
          const row = { id: newId(), ...body, createdAt: now().toISOString() };
          data.accounts.push(row);
          return accountsWithBalances(data).find((a) => a.id === row.id)!;
        }, true),
      update: (id, input) =>
        tx((db) => {
          const { data } = userData(db);
          const body = parse(accountUpdateSchema, input);
          const row = data.accounts.find((a) => a.id === parseId(id));
          if (!row) throw notFound('Account');
          if (body.name && data.accounts.some((a) => a.id !== id && sameName(a.name, body.name!))) {
            throw conflict('A record with the same name already exists');
          }
          Object.assign(row, body);
          return accountsWithBalances(data).find((a) => a.id === id)!;
        }, true),
      remove: (id) =>
        tx((db) => {
          const { data } = userData(db);
          if (!data.accounts.some((a) => a.id === id)) throw notFound('Account');
          const used = data.transactions.filter((t) => t.accountId === id).length;
          if (used > 0) {
            throw conflict(
              `This account has ${used} transaction(s). Delete or move them before removing the account.`,
            );
          }
          data.accounts = data.accounts.filter((a) => a.id !== id);
        }, true),
    },

    categories: {
      list: () => tx((db) => categoriesWithCounts(userData(db).data)),
      create: (input) =>
        tx((db) => {
          const { data } = userData(db);
          const body = parse(categoryInputSchema, input);
          if (data.categories.some((c) => c.type === body.type && sameName(c.name, body.name))) {
            throw conflict('A record with the same name already exists');
          }
          const row = { id: newId(), ...body, createdAt: now().toISOString() };
          data.categories.push(row);
          return { ...row, transactionCount: 0 };
        }, true),
      update: (id, input) =>
        tx((db) => {
          const { data } = userData(db);
          const body = parse(categoryUpdateSchema, input);
          const row = data.categories.find((c) => c.id === parseId(id));
          if (!row) throw notFound('Category');
          if (
            body.name &&
            data.categories.some(
              (c) => c.id !== id && c.type === row.type && sameName(c.name, body.name!),
            )
          ) {
            throw conflict('A record with the same name already exists');
          }
          Object.assign(row, body);
          return categoriesWithCounts(data).find((c) => c.id === id)!;
        }, true),
      remove: (id) =>
        tx((db) => {
          const { data } = userData(db);
          if (!data.categories.some((c) => c.id === id)) throw notFound('Category');
          const used = data.transactions.filter((t) => t.categoryId === id).length;
          if (used > 0) {
            throw conflict(
              `This category is used by ${used} transaction(s). Recategorise them before deleting it.`,
            );
          }
          data.categories = data.categories.filter((c) => c.id !== id);
          data.budgets = data.budgets.filter((b) => b.categoryId !== id);
        }, true),
    },

    transactions: {
      list: (filters) =>
        tx((db) => {
          const { data } = userData(db);
          const { page, limit, ...q } = parse(transactionQuerySchema, filters);
          const rows = filterTransactions(data, q);
          return {
            data: rows
              .slice((page - 1) * limit, page * limit)
              .map((t) => hydrateTransaction(data, t)),
            meta: {
              page,
              limit,
              total: rows.length,
              totalPages: Math.max(1, Math.ceil(rows.length / limit)),
            },
          };
        }),
      create: (input) =>
        tx((db) => {
          const { data } = userData(db);
          const body = parse(transactionInputSchema, input);
          assertCategory(data, body.categoryId, body.type);
          assertAccount(data, body.accountId);
          const stamp = now().toISOString();
          const row = { id: newId(), ...body, createdAt: stamp, updatedAt: stamp };
          data.transactions.push(row);
          return hydrateTransaction(data, row);
        }, true),
      update: (id, input) =>
        tx((db) => {
          const { data } = userData(db);
          const body = parse(transactionUpdateSchema, input);
          const row = data.transactions.find((t) => t.id === parseId(id));
          if (!row) throw notFound('Transaction');
          const next = {
            ...row,
            ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)),
          };
          if (body.type || body.categoryId) assertCategory(data, next.categoryId, next.type);
          if (body.accountId) assertAccount(data, next.accountId);
          Object.assign(row, next, { updatedAt: now().toISOString() });
          return hydrateTransaction(data, row);
        }, true),
      remove: (id) =>
        tx((db) => {
          const { data } = userData(db);
          const before = data.transactions.length;
          data.transactions = data.transactions.filter((t) => t.id !== id);
          if (data.transactions.length === before) throw notFound('Transaction');
        }, true),
      exportCsv: (filters) =>
        tx((db) => {
          const { data } = userData(db);
          const { page: _p, limit: _l, ...q } = parse(transactionQuerySchema, filters);
          const rows = filterTransactions(data, q).map((t) => hydrateTransaction(data, t));
          return { csv: `\uFEFF${transactionsToCsv(rows)}`, fileName: csvFileName(q.from, q.to) };
        }).then(({ csv, fileName }) => ({
          blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
          fileName,
        })),
    },

    budgets: {
      list: (month) => tx((db) => budgetStatuses(userData(db).data, parse(monthKeySchema, month))),
      upsert: (categoryId, amount, month) =>
        tx((db) => {
          const { data } = userData(db);
          const body = parse(budgetInputSchema, { amount });
          const category = data.categories.find((c) => c.id === parseId(categoryId));
          if (!category) throw notFound('Category');
          if (category.type !== 'expense')
            throw new ApiError(400, 'BAD_REQUEST', 'Budgets can only be set on expense categories');
          const existing = data.budgets.find((b) => b.categoryId === categoryId);
          if (existing) existing.amount = body.amount;
          else data.budgets.push({ id: newId(), categoryId, amount: body.amount });
          return budgetStatuses(data, month).find((b) => b.category.id === categoryId)!;
        }, true),
      remove: (categoryId) =>
        tx((db) => {
          const { data } = userData(db);
          const before = data.budgets.length;
          data.budgets = data.budgets.filter((b) => b.categoryId !== categoryId);
          if (data.budgets.length === before) throw notFound('Budget');
        }, true),
    },

    dashboard: {
      summary: (month) =>
        tx((db) => dashboardSummary(userData(db).data, parse(monthKeySchema, month))),
    },

    resetDemo: () =>
      tx(async (db) => {
        const user = await ensureDemoUser(db);
        db.data[user.id] = demoUserData(now());
      }, true),
  };
}

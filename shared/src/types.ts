import type { AccountType, CategoryIcon, TransactionType } from './constants';

export interface User {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  /** Paise. */
  openingBalance: number;
  /** Paise: opening balance + income - expense. */
  balance: number;
  transactionCount: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: CategoryIcon;
  color: string;
  transactionCount: number;
  createdAt: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  icon: CategoryIcon;
  color: string;
}

export interface AccountRef {
  id: string;
  name: string;
  type: AccountType;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Paise, always positive; `type` carries the sign. */
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  note: string;
  tags: string[];
  category: CategoryRef;
  account: AccountRef;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export type BudgetState = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  id: string;
  category: CategoryRef;
  /** Monthly limit in paise. */
  amount: number;
  spent: number;
  remaining: number;
  /** spent / amount, 0..n (can exceed 1). */
  ratio: number;
  state: BudgetState;
}

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

export interface CategorySlice {
  category: CategoryRef;
  amount: number;
}

export interface DashboardSummary {
  month: string;
  totals: MonthTotals;
  previousTotals: MonthTotals;
  /** Oldest month first. */
  trend: TrendPoint[];
  spendingByCategory: CategorySlice[];
  recent: Transaction[];
  budgets: BudgetStatus[];
  netWorth: number;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: { path: string; message: string }[];
  };
}

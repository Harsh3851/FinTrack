import type {
  Account,
  AccountInputRaw,
  AccountUpdate,
  AuthResponse,
  BudgetStatus,
  Category,
  CategoryInputRaw,
  CategoryUpdate,
  DashboardSummary,
  LoginInput,
  Paginated,
  RegisterInput,
  Transaction,
  TransactionFilters,
  TransactionInputRaw,
  User,
} from '@fintrack/shared';

/**
 * The one contract the UI depends on. `httpSource` implements it against the
 * Express API; `demoSource` implements it in the browser with localStorage.
 */
export interface DataSource {
  readonly mode: 'api' | 'demo';
  auth: {
    register(input: RegisterInput): Promise<AuthResponse>;
    login(input: LoginInput): Promise<AuthResponse>;
    demo(): Promise<AuthResponse>;
    /** Restores a previous session (refresh cookie / stored demo session). */
    restore(): Promise<User | null>;
    logout(): Promise<void>;
  };
  accounts: {
    list(): Promise<Account[]>;
    create(input: AccountInputRaw): Promise<Account>;
    update(id: string, input: AccountUpdate): Promise<Account>;
    remove(id: string): Promise<void>;
  };
  categories: {
    list(): Promise<Category[]>;
    create(input: CategoryInputRaw): Promise<Category>;
    update(id: string, input: CategoryUpdate): Promise<Category>;
    remove(id: string): Promise<void>;
  };
  transactions: {
    list(filters: TransactionFilters): Promise<Paginated<Transaction>>;
    create(input: TransactionInputRaw): Promise<Transaction>;
    update(id: string, input: Partial<TransactionInputRaw>): Promise<Transaction>;
    remove(id: string): Promise<void>;
    exportCsv(filters: TransactionFilters): Promise<{ blob: Blob; fileName: string }>;
  };
  budgets: {
    list(month: string): Promise<BudgetStatus[]>;
    upsert(categoryId: string, amount: number, month: string): Promise<BudgetStatus>;
    remove(categoryId: string): Promise<void>;
  };
  dashboard: {
    summary(month: string): Promise<DashboardSummary>;
  };
  /** Demo mode only: wipe local data and re-seed the demo account. */
  resetDemo?(): Promise<void>;
}

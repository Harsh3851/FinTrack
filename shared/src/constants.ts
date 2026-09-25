export const ACCOUNT_TYPES = ['bank', 'cash', 'card', 'wallet'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Icon keys understood by the client (mapped to lucide icons). */
export const CATEGORY_ICONS = [
  'utensils',
  'shopping-cart',
  'home',
  'car',
  'fuel',
  'zap',
  'heart-pulse',
  'film',
  'shopping-bag',
  'plane',
  'graduation-cap',
  'repeat',
  'smartphone',
  'coffee',
  'gift',
  'shield',
  'briefcase',
  'laptop',
  'trending-up',
  'piggy-bank',
  'landmark',
  'wallet',
  'receipt',
  'tag',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/**
 * Categorical colour swatches offered for categories and accounts.
 * The first eight follow a colour-vision-deficiency validated order.
 */
export const SWATCHES = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
  '#0f766e',
  '#64748b',
] as const;

export interface DefaultCategory {
  key: string;
  name: string;
  type: TransactionType;
  icon: CategoryIcon;
  color: string;
}

/** Categories seeded for every new user. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { key: 'food', name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#eb6834' },
  { key: 'groceries', name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#1baf7a' },
  { key: 'rent', name: 'Rent', type: 'expense', icon: 'home', color: '#2a78d6' },
  { key: 'transport', name: 'Transport', type: 'expense', icon: 'car', color: '#eda100' },
  { key: 'utilities', name: 'Bills & Utilities', type: 'expense', icon: 'zap', color: '#4a3aa7' },
  { key: 'health', name: 'Health', type: 'expense', icon: 'heart-pulse', color: '#e34948' },
  { key: 'entertainment', name: 'Entertainment', type: 'expense', icon: 'film', color: '#e87ba4' },
  { key: 'shopping', name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#008300' },
  { key: 'travel', name: 'Travel', type: 'expense', icon: 'plane', color: '#0f766e' },
  {
    key: 'education',
    name: 'Education',
    type: 'expense',
    icon: 'graduation-cap',
    color: '#64748b',
  },
  {
    key: 'subscriptions',
    name: 'Subscriptions',
    type: 'expense',
    icon: 'repeat',
    color: '#4a3aa7',
  },
  { key: 'other-expense', name: 'Other Expense', type: 'expense', icon: 'tag', color: '#64748b' },
  { key: 'salary', name: 'Salary', type: 'income', icon: 'briefcase', color: '#2a78d6' },
  { key: 'freelance', name: 'Freelance', type: 'income', icon: 'laptop', color: '#1baf7a' },
  {
    key: 'investments',
    name: 'Investments',
    type: 'income',
    icon: 'trending-up',
    color: '#008300',
  },
  { key: 'gifts', name: 'Gifts', type: 'income', icon: 'gift', color: '#e87ba4' },
  {
    key: 'other-income',
    name: 'Other Income',
    type: 'income',
    icon: 'piggy-bank',
    color: '#64748b',
  },
];

export const DEMO_USER = {
  name: 'Aarav Mehta',
  email: 'demo@fintrack.app',
  password: 'Demo@12345',
} as const;

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;
/** Hard ceiling on a single amount: ₹10 crore, in paise. */
export const MAX_AMOUNT_PAISE = 10_00_00_000 * 100;
/** Budget progress at or above this ratio is flagged as a warning. */
export const BUDGET_WARNING_RATIO = 0.8;

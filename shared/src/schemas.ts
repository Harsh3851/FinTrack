import { z } from 'zod';
import {
  ACCOUNT_TYPES,
  CATEGORY_ICONS,
  MAX_AMOUNT_PAISE,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  TRANSACTION_TYPES,
} from './constants';
import { isIsoDate, isMonthKey } from './dates';

export const idSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
export const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a hex colour like #2a78d6');
export const isoDateSchema = z.string().refine(isIsoDate, 'Use a valid date (YYYY-MM-DD)');
export const monthKeySchema = z.string().refine(isMonthKey, 'Use a month like 2026-09');

const amountSchema = z
  .number({ invalid_type_error: 'Amount must be a number' })
  .int('Amount must be in paise (whole number)')
  .positive('Amount must be greater than zero')
  .max(MAX_AMOUNT_PAISE, 'Amount is too large');

// ---------- Auth ----------

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(120);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- Accounts ----------

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Keep it under 40 characters'),
  type: z.enum(ACCOUNT_TYPES),
  openingBalance: z.number().int().min(-MAX_AMOUNT_PAISE).max(MAX_AMOUNT_PAISE).default(0),
  color: hexColorSchema.default('#2a78d6'),
});
export type AccountInput = z.infer<typeof accountInputSchema>;
export const accountUpdateSchema = accountInputSchema.partial();
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;

// ---------- Categories ----------

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(30, 'Keep it under 30 characters'),
  type: z.enum(TRANSACTION_TYPES),
  icon: z.enum(CATEGORY_ICONS).default('tag'),
  color: hexColorSchema.default('#64748b'),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const categoryUpdateSchema = categoryInputSchema.omit({ type: true }).partial();
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

// ---------- Transactions ----------

const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(24, 'Tags must be at most 24 characters')
  .regex(/^[a-z0-9][a-z0-9-_ ]*$/, 'Tags may contain letters, numbers, spaces, - and _');

export const transactionInputSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: amountSchema,
  categoryId: idSchema,
  accountId: idSchema,
  date: isoDateSchema,
  note: z.string().trim().max(200, 'Keep the note under 200 characters').default(''),
  tags: z
    .array(tagSchema)
    .max(10, 'At most 10 tags')
    .default([])
    .transform((tags) => [...new Set(tags)]),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type TransactionInputRaw = z.input<typeof transactionInputSchema>;

export const transactionUpdateSchema = transactionInputSchema.partial();
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;

export const TRANSACTION_SORTS = ['-date', 'date', '-amount', 'amount'] as const;
export type TransactionSort = (typeof TRANSACTION_SORTS)[number];

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const transactionQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
    type: z.preprocess(emptyToUndefined, z.enum(TRANSACTION_TYPES).optional()),
    categoryId: z.preprocess(emptyToUndefined, idSchema.optional()),
    accountId: z.preprocess(emptyToUndefined, idSchema.optional()),
    from: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
    to: z.preprocess(emptyToUndefined, isoDateSchema.optional()),
    q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    sort: z.preprocess(emptyToUndefined, z.enum(TRANSACTION_SORTS).default('-date')),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: '"from" must be on or before "to"',
    path: ['to'],
  });
export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
export type TransactionFilters = Partial<Omit<TransactionQuery, 'page' | 'limit'>> & {
  page?: number;
  limit?: number;
};

// ---------- Budgets ----------

export const budgetInputSchema = z.object({
  amount: amountSchema,
});
export type BudgetInput = z.infer<typeof budgetInputSchema>;

export const monthQuerySchema = z.object({
  month: z.preprocess(emptyToUndefined, monthKeySchema.optional()),
});

export type AccountInputRaw = z.input<typeof accountInputSchema>;
export type CategoryInputRaw = z.input<typeof categoryInputSchema>;

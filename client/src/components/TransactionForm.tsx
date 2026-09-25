import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  TRANSACTION_TYPES,
  isIsoDate,
  isRupeeInput,
  paiseToRupeesString,
  rupeesToPaise,
  todayIso,
  type Transaction,
  type TransactionInputRaw,
} from '@fintrack/shared';
import { useAccounts, useCategories } from '../data/queries';
import { ApiError, errorMessage } from '../lib/errors';
import { cn } from '../lib/cn';
import { Field, Input, Select } from './ui/Field';
import { Button } from './ui/Button';

export const transactionFormSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.string().superRefine((value, ctx) => {
    const text = value.trim();
    if (!text) return ctx.addIssue({ code: 'custom', message: 'Enter an amount' });
    if (!isRupeeInput(text))
      return ctx.addIssue({ code: 'custom', message: 'Use a number with up to 2 decimals' });
    if (rupeesToPaise(text) <= 0)
      ctx.addIssue({ code: 'custom', message: 'Amount must be greater than zero' });
  }),
  categoryId: z.string().min(1, 'Pick a category'),
  accountId: z.string().min(1, 'Pick an account'),
  date: z.string().refine(isIsoDate, 'Pick a valid date'),
  note: z.string().max(200, 'Keep the note under 200 characters'),
  tags: z
    .string()
    .max(250)
    .refine((v) => splitTags(v).length <= 10, 'At most 10 tags')
    .refine(
      (v) => splitTags(v).every((t) => t.length <= 24),
      'Each tag must be at most 24 characters',
    ),
});
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const splitTags = (value: string) =>
  value
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

export function toTransactionInput(values: TransactionFormValues): TransactionInputRaw {
  return {
    type: values.type,
    amount: rupeesToPaise(values.amount),
    categoryId: values.categoryId,
    accountId: values.accountId,
    date: values.date,
    note: values.note.trim(),
    tags: splitTags(values.tags),
  };
}

interface Props {
  initial?: Transaction | null;
  submitLabel: string;
  onSubmit(input: TransactionInputRaw): Promise<unknown>;
  onCancel(): void;
}

export function TransactionForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: initial?.type ?? 'expense',
      amount: initial ? paiseToRupeesString(initial.amount) : '',
      categoryId: initial?.category.id ?? '',
      accountId: initial?.account.id ?? '',
      date: initial?.date ?? todayIso(),
      note: initial?.note ?? '',
      tags: initial?.tags.join(', ') ?? '',
    },
  });

  const type = useWatch({ control, name: 'type' });
  const options = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  // Keep the category consistent with the chosen type, and default the account.
  useEffect(() => {
    const current = getValues('categoryId');
    if (current && categories.length && !options.some((c) => c.id === current))
      setValue('categoryId', '');
  }, [options, categories.length, getValues, setValue]);
  useEffect(() => {
    if (!getValues('accountId') && accounts[0]) setValue('accountId', accounts[0].id);
  }, [accounts, getValues, setValue]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toTransactionInput(values));
    } catch (err) {
      if (err instanceof ApiError && err.details.length) {
        for (const d of err.details) {
          if (d.path in values)
            setError(d.path as keyof TransactionFormValues, { message: d.message });
        }
      }
      toast.error(errorMessage(err));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <fieldset>
        <legend className="sr-only">Transaction type</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {TRANSACTION_TYPES.map((t) => (
            <label
              key={t}
              className={cn(
                'flex h-9 cursor-pointer items-center justify-center rounded-lg text-sm font-medium capitalize transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                type !== t
                  ? 'text-fg-3 hover:text-fg'
                  : t === 'expense'
                    ? 'bg-surface text-expense shadow-card'
                    : 'bg-surface text-income shadow-card',
              )}
            >
              <input type="radio" value={t} className="sr-only" {...register('type')} />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (₹)" error={errors.amount?.message}>
          {(a) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-fg-3">
                ₹
              </span>
              <Input
                {...a}
                data-autofocus
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                className="pl-7 tabular"
                {...register('amount')}
              />
            </div>
          )}
        </Field>
        <Field label="Date" error={errors.date?.message}>
          {(a) => <Input {...a} type="date" max="2100-12-31" {...register('date')} />}
        </Field>
        <Field label="Category" error={errors.categoryId?.message}>
          {(a) => (
            <Select {...a} {...register('categoryId')}>
              <option value="">Select a category</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Account" error={errors.accountId?.message}>
          {(a) => (
            <Select {...a} {...register('accountId')}>
              <option value="">Select an account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Note" error={errors.note?.message}>
        {(a) => (
          <Input
            {...a}
            placeholder="e.g. Dinner with friends"
            maxLength={200}
            {...register('note')}
          />
        )}
      </Field>
      <Field
        label="Tags"
        hint="Separate with commas, e.g. work, trip-goa"
        error={errors.tags?.message}
      >
        {(a) => <Input {...a} placeholder="Optional" {...register('tags')} />}
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

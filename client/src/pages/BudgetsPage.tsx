import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil, Plus, Target, Trash2 } from 'lucide-react';
import {
  currentMonthKey,
  formatINR,
  formatMonth,
  isRupeeInput,
  paiseToRupeesString,
  rupeesToPaise,
  type BudgetStatus,
} from '@fintrack/shared';
import { dataSource } from '../data';
import { useBudgets, useCategories, useDataMutation } from '../data/queries';
import { PageHeader } from '../components/PageHeader';
import { MonthPicker } from '../components/MonthPicker';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { BudgetRow } from '../components/BudgetRow';
import { CategoryIcon } from '../components/CategoryIcon';
import { errorMessage } from '../lib/errors';

const schema = z.object({
  categoryId: z.string().min(1, 'Pick a category'),
  amount: z
    .string()
    .refine((v) => isRupeeInput(v), 'Use a number with up to 2 decimals')
    .refine((v) => isRupeeInput(v) && rupeesToPaise(v) > 0, 'Budget must be greater than zero'),
});
type Values = z.infer<typeof schema>;

function BudgetDialog({
  open,
  onClose,
  month,
  editing,
  presetCategoryId,
  available,
}: {
  open: boolean;
  onClose(): void;
  month: string;
  editing: BudgetStatus | null;
  presetCategoryId?: string;
  available: { id: string; name: string }[];
}) {
  const save = useDataMutation((v: Values) =>
    dataSource.budgets.upsert(v.categoryId, rupeesToPaise(v.amount), month),
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: editing?.category.id ?? presetCategoryId ?? '',
      amount: editing ? paiseToRupeesString(editing.amount).replace(/\.00$/, '') : '',
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v);
      toast.success(editing ? 'Budget updated' : 'Budget created');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={editing ? `Edit ${editing.category.name} budget` : 'New monthly budget'}
      description="Budgets repeat every month."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!editing && (
          <Field label="Category" error={errors.categoryId?.message}>
            {(a) => (
              <Select {...a} {...register('categoryId')}>
                <option value="">Select an expense category</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Monthly limit (₹)" error={errors.amount?.message}>
          {(a) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-fg-3">
                ₹
              </span>
              <Input
                {...a}
                data-autofocus
                inputMode="decimal"
                placeholder="5000"
                className="tabular pl-7"
                {...register('amount')}
              />
            </div>
          )}
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Save budget
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function BudgetsPage() {
  const [month, setMonth] = useState(currentMonthKey);
  const { data: budgets, isPending, isError, error, refetch } = useBudgets(month);
  const { data: categories = [] } = useCategories();
  const [dialog, setDialog] = useState<{
    open: boolean;
    editing: BudgetStatus | null;
    preset?: string;
  }>({ open: false, editing: null });
  const [pendingDelete, setPendingDelete] = useState<BudgetStatus | null>(null);
  const remove = useDataMutation((categoryId: string) => dataSource.budgets.remove(categoryId));

  const unbudgeted = useMemo(
    () =>
      categories.filter(
        (c) => c.type === 'expense' && !budgets?.some((b) => b.category.id === c.id),
      ),
    [categories, budgets],
  );
  const totals = useMemo(() => {
    const list = budgets ?? [];
    const amount = list.reduce((s, b) => s + b.amount, 0);
    const spent = list.reduce((s, b) => s + b.spent, 0);
    return { amount, spent, over: list.filter((b) => b.state === 'over').length };
  }, [budgets]);

  const openNew = (preset?: string) => setDialog({ open: true, editing: null, preset });

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Monthly spending limits per category."
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => openNew()}
              disabled={!unbudgeted.length}
            >
              New budget
            </Button>
          </>
        }
      />

      {budgets && budgets.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2.5 sm:gap-4">
          {[
            { label: 'Budgeted', value: formatINR(totals.amount, { whole: true }) },
            {
              label: `Spent in ${formatMonth(month, true)}`,
              value: formatINR(totals.spent, { whole: true }),
            },
            {
              label: totals.over ? `Remaining · ${totals.over} over` : 'Remaining',
              value: formatINR(totals.amount - totals.spent, { whole: true }),
            },
          ].map((s) => (
            <Card key={s.label} className="px-3 py-3 sm:px-5 sm:py-4">
              <p className="truncate text-xs text-fg-3 sm:text-[13px]">{s.label}</p>
              <p className="tabular mt-1 truncate text-[15px] font-semibold text-fg sm:text-xl">
                {s.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Your budgets" description={`Progress for ${formatMonth(month)}`} />
          {isPending ? (
            <SkeletonRows rows={5} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} />
          ) : budgets.length === 0 ? (
            <EmptyState
              icon={<Target className="h-5 w-5" />}
              title="No budgets yet"
              description="Pick a category like Food & Dining and set how much you want to spend in a month."
              action={
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openNew()}>
                  Create a budget
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-line px-5 pb-2 pt-1">
              {budgets.map((b) => (
                <BudgetRow
                  key={b.id}
                  budget={b}
                  action={
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${b.category.name} budget`}
                        onClick={() => setDialog({ open: true, editing: b })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${b.category.name} budget`}
                        onClick={() => setPendingDelete(b)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Without a budget"
            description="Expense categories you are not tracking yet"
          />
          <ul className="flex flex-col px-3 pb-3 pt-2">
            {unbudgeted.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-fg-3">
                Every expense category has a budget.
              </li>
            )}
            {unbudgeted.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2"
              >
                <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                <span className="flex-1 truncate text-sm text-fg">{c.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openNew(c.id)}
                  aria-label={`Set budget for ${c.name}`}
                >
                  <Plus className="h-3.5 w-3.5" /> Set
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {dialog.open && (
        <BudgetDialog
          open
          onClose={() => setDialog({ open: false, editing: null })}
          month={month}
          editing={dialog.editing}
          presetCategoryId={dialog.preset}
          available={unbudgeted}
        />
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove budget?"
        confirmLabel="Remove"
        message={
          pendingDelete && (
            <>
              The monthly limit for{' '}
              <strong className="text-fg">{pendingDelete.category.name}</strong> will be removed.
              Transactions are not affected.
            </>
          )
        }
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(pendingDelete!.category.id);
            toast.success('Budget removed');
            setPendingDelete(null);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}

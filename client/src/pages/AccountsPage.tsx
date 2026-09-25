import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import {
  ACCOUNT_TYPES,
  SWATCHES,
  formatINR,
  isRupeeInput,
  paiseToRupeesString,
  rupeesToPaise,
  type Account,
  type AccountType,
} from '@fintrack/shared';
import { dataSource } from '../data';
import { useAccounts, useDataMutation } from '../data/queries';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { ColorSwatches } from '../components/Pickers';
import { ACCOUNT_ICONS } from '../components/CategoryIcon';
import { errorMessage } from '../lib/errors';

const TYPE_LABELS: Record<AccountType, string> = {
  bank: 'Bank account',
  cash: 'Cash',
  card: 'Credit card',
  wallet: 'Wallet / UPI',
};

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Keep it under 40 characters'),
  type: z.enum(ACCOUNT_TYPES),
  openingBalance: z
    .string()
    .refine(
      (v) => v.trim() === '' || isRupeeInput(v.trim().replace(/^-/, '')),
      'Use a number with up to 2 decimals',
    ),
  color: z.string(),
});
type Values = z.infer<typeof schema>;

const toPaise = (v: string) => {
  const text = v.trim();
  if (!text) return 0;
  const negative = text.startsWith('-');
  const paise = rupeesToPaise(text.replace(/^-/, ''));
  return negative ? -paise : paise;
};

function AccountDialog({ editing, onClose }: { editing: Account | null; onClose(): void }) {
  const save = useDataMutation((v: Values) => {
    const input = {
      name: v.name,
      type: v.type,
      color: v.color,
      openingBalance: toPaise(v.openingBalance),
    };
    return editing
      ? dataSource.accounts.update(editing.id, input)
      : dataSource.accounts.create(input);
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editing?.name ?? '',
      type: editing?.type ?? 'bank',
      openingBalance: editing ? paiseToRupeesString(editing.openingBalance) : '',
      color: editing?.color ?? SWATCHES[0],
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v);
      toast.success(editing ? 'Account updated' : 'Account added');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit account' : 'Add account'} size="sm">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Name" error={errors.name?.message}>
          {(a) => (
            <Input {...a} data-autofocus placeholder="e.g. SBI Savings" {...register('name')} />
          )}
        </Field>
        <Field label="Type" error={errors.type?.message}>
          {(a) => (
            <Select {...a} {...register('type')}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Opening balance (₹)"
          hint="Use a negative number for money owed, e.g. a card balance."
          error={errors.openingBalance?.message}
        >
          {(a) => (
            <Input
              {...a}
              inputMode="decimal"
              placeholder="0.00"
              className="tabular"
              {...register('openingBalance')}
            />
          )}
        </Field>
        <Controller
          control={control}
          name="color"
          render={({ field }) => <ColorSwatches value={field.value} onChange={field.onChange} />}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Add account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AccountsPage() {
  const { data: accounts, isPending, isError, error, refetch } = useAccounts();
  const [dialog, setDialog] = useState<{ open: boolean; editing: Account | null }>({
    open: false,
    editing: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);
  const remove = useDataMutation((id: string) => dataSource.accounts.remove(id));
  const total = accounts?.reduce((s, a) => s + a.balance, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Accounts"
        description={
          accounts?.length ? (
            <>
              Total balance{' '}
              <span className="tabular font-semibold text-fg">{formatINR(total)}</span>
            </>
          ) : (
            'Where your money lives.'
          )
        }
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setDialog({ open: true, editing: null })}
          >
            Add account
          </Button>
        }
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-4 h-4 w-32" />
              <Skeleton className="mt-3 h-7 w-40" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="h-5 w-5" />}
            title="No accounts yet"
            description="Add a bank account, cash or card to start tracking balances."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const Icon = ACCOUNT_ICONS[a.type];
            return (
              <Card key={a.id} className="group relative overflow-hidden p-5">
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: a.color }}
                  aria-hidden
                />
                <div className="flex items-start justify-between">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                      color: `color-mix(in srgb, ${a.color} 82%, var(--text))`,
                    }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${a.name}`}
                      onClick={() => setDialog({ open: true, editing: a })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${a.name}`}
                      onClick={() => setPendingDelete(a)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-fg">{a.name}</p>
                <p className="text-xs text-fg-3">{TYPE_LABELS[a.type]}</p>
                <p
                  className={`tabular mt-3 text-2xl font-semibold tracking-tight ${a.balance < 0 ? 'text-danger' : 'text-fg'}`}
                >
                  {formatINR(a.balance)}
                </p>
                <p className="tabular mt-1 text-xs text-fg-3">
                  Opening {formatINR(a.openingBalance)} · {a.transactionCount} transaction
                  {a.transactionCount === 1 ? '' : 's'}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {dialog.open && (
        <AccountDialog
          editing={dialog.editing}
          onClose={() => setDialog({ open: false, editing: null })}
        />
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete account?"
        message={
          pendingDelete && (
            <>
              <strong className="text-fg">{pendingDelete.name}</strong> will be removed. Accounts
              with transactions cannot be deleted.
            </>
          )
        }
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(pendingDelete!.id);
            toast.success('Account deleted');
            setPendingDelete(null);
          } catch (err) {
            toast.error(errorMessage(err));
            setPendingDelete(null);
          }
        }}
      />
    </>
  );
}

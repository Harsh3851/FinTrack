import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  categoryInputSchema,
  type Category,
  type CategoryInputRaw,
  type TransactionType,
} from '@fintrack/shared';
import type { z } from 'zod';
import { dataSource } from '../data';
import { useCategories, useDataMutation } from '../data/queries';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { CategoryIcon } from '../components/CategoryIcon';
import { ColorSwatches, IconPicker } from '../components/Pickers';
import { errorMessage } from '../lib/errors';
import { cn } from '../lib/cn';

type Values = z.input<typeof categoryInputSchema>;

function CategoryDialog({
  editing,
  type,
  onClose,
}: {
  editing: Category | null;
  type: TransactionType;
  onClose(): void;
}) {
  const save = useDataMutation((v: CategoryInputRaw) =>
    editing
      ? dataSource.categories.update(editing.id, { name: v.name, icon: v.icon, color: v.color })
      : dataSource.categories.create(v),
  );
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: {
      name: editing?.name ?? '',
      type: editing?.type ?? type,
      icon: editing?.icon ?? 'tag',
      color: editing?.color ?? '#2a78d6',
    },
  });
  const color = useWatch({ control, name: 'color' }) ?? '#2a78d6';

  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v);
      toast.success(editing ? 'Category updated' : 'Category added');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit category' : `New ${type} category`}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Name" error={errors.name?.message}>
          {(a) => <Input {...a} data-autofocus placeholder="e.g. Pets" {...register('name')} />}
        </Field>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <IconPicker value={field.value ?? 'tag'} onChange={field.onChange} color={color} />
          )}
        />
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <ColorSwatches value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CategoriesPage() {
  const { data: categories, isPending, isError, error, refetch } = useCategories();
  const [tab, setTab] = useState<TransactionType>('expense');
  const [dialog, setDialog] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const remove = useDataMutation((id: string) => dataSource.categories.remove(id));
  const list = categories?.filter((c) => c.type === tab) ?? [];

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise transactions with your own icons and colours."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setDialog({ open: true, editing: null })}
          >
            New category
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Category type"
        className="mb-4 inline-grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1 shadow-card"
      >
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'h-8 rounded-md px-5 text-[13px] font-medium capitalize',
              tab === t ? 'bg-primary-soft text-primary' : 'text-fg-3 hover:text-fg',
            )}
          >
            {t} ({categories?.filter((c) => c.type === t).length ?? 0})
          </button>
        ))}
      </div>

      <Card>
        {isPending ? (
          <SkeletonRows rows={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-5 w-5" />}
            title={`No ${tab} categories`}
            description="Create one to start organising transactions."
          />
        ) : (
          <ul role="tabpanel" className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {list.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-5 py-3 sm:border-b sm:border-line"
              >
                <CategoryIcon icon={c.icon} color={c.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                  <p className="text-xs text-fg-3">
                    {c.transactionCount} transaction{c.transactionCount === 1 ? '' : 's'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${c.name}`}
                  onClick={() => setDialog({ open: true, editing: c })}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => setPendingDelete(c)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {dialog.open && (
        <CategoryDialog
          editing={dialog.editing}
          type={tab}
          onClose={() => setDialog({ open: false, editing: null })}
        />
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete category?"
        message={
          pendingDelete && (
            <>
              <strong className="text-fg">{pendingDelete.name}</strong> will be removed along with
              its budget. Categories used by transactions cannot be deleted.
            </>
          )
        }
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(pendingDelete!.id);
            toast.success('Category deleted');
          } catch (err) {
            toast.error(errorMessage(err));
          }
          setPendingDelete(null);
        }}
      />
    </>
  );
}

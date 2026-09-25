import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FilterX,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import {
  TRANSACTION_SORTS,
  formatDate,
  isIsoDate,
  type Transaction,
  type TransactionFilters,
  type TransactionSort,
} from '@fintrack/shared';
import { dataSource } from '../data';
import { useAccounts, useCategories, useDataMutation, useTransactions } from '../data/queries';
import { useDebounced } from '../hooks/useDebounced';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, Input, Select } from '../components/ui/Field';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { ConfirmDialog } from '../components/ui/Modal';
import { CategoryIcon } from '../components/CategoryIcon';
import { Money } from '../components/Money';
import { TransactionItem } from '../components/TransactionItem';
import { useTransactionDialog } from '../components/TransactionDialog';
import { downloadBlob } from '../lib/download';
import { errorMessage } from '../lib/errors';
import { cn } from '../lib/cn';

const SORT_LABELS: Record<TransactionSort, string> = {
  '-date': 'Newest first',
  date: 'Oldest first',
  '-amount': 'Highest amount',
  amount: 'Lowest amount',
};
const PAGE_SIZES = [10, 20, 50];
const FILTER_KEYS = ['q', 'type', 'categoryId', 'accountId', 'from', 'to', 'sort'] as const;

function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<TransactionFilters>(() => {
    const type = params.get('type');
    const sort = params.get('sort') as TransactionSort | null;
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    return {
      page: Math.max(1, Number(params.get('page')) || 1),
      limit: PAGE_SIZES.includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 20,
      q: params.get('q') || undefined,
      type: type === 'income' || type === 'expense' ? type : undefined,
      categoryId: params.get('categoryId') || undefined,
      accountId: params.get('accountId') || undefined,
      from: isIsoDate(from) ? from : undefined,
      to: isIsoDate(to) && (!isIsoDate(from) || to >= from) ? to : undefined,
      sort: sort && TRANSACTION_SORTS.includes(sort) ? sort : '-date',
    };
  }, [params]);

  const update = (
    patch: Partial<Record<keyof TransactionFilters, string | number | undefined>>,
    resetPage = true,
  ) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === '' || (key === 'sort' && value === '-date'))
            next.delete(key);
          else next.set(key, String(value));
        }
        if (resetPage && !('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };
  const clear = () => setParams({}, { replace: true });
  const active = FILTER_KEYS.some((k) => k !== 'sort' && params.get(k));
  return { filters, update, clear, active };
}

export function TransactionsPage() {
  const { filters, update, clear, active } = useFilters();
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useTransactions(filters);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { openCreate, openEdit } = useTransactionDialog();
  const [search, setSearch] = useState(filters.q ?? '');
  const debounced = useDebounced(search);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if ((debounced || undefined) !== filters.q) update({ q: debounced.trim() || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced input
  }, [debounced]);

  const remove = useDataMutation((id: string) => dataSource.transactions.remove(id));

  const visibleCategories = categories.filter((c) => !filters.type || c.type === filters.type);

  const onExport = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await dataSource.transactions.exportCsv(filters);
      downloadBlob(blob, fileName);
      toast.success('CSV exported');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.success('Transaction deleted');
      setPendingDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const meta = data?.meta;

  // Deleting the last row of the last page should not strand the user on an empty page.
  useEffect(() => {
    if (meta && meta.total > 0 && meta.page > meta.totalPages)
      update({ page: meta.totalPages }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update is recreated each render
  }, [meta?.page, meta?.totalPages, meta?.total]);
  const start = meta && meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const end = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Search, filter and export everything you have recorded."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
              loading={exporting}
              onClick={onExport}
              disabled={!meta?.total}
            >
              Export CSV
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add transaction
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="tx-search" className="sr-only">
              Search transactions
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3"
              aria-hidden
            />
            <Input
              id="tx-search"
              type="search"
              placeholder="Search notes, tags or categories"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div
            role="radiogroup"
            aria-label="Transaction type"
            className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1 md:w-72"
          >
            {(['', 'income', 'expense'] as const).map((t) => (
              <button
                key={t || 'all'}
                type="button"
                role="radio"
                aria-checked={(filters.type ?? '') === t}
                onClick={() => update({ type: t || undefined, categoryId: undefined })}
                className={cn(
                  'h-8 rounded-md text-[13px] font-medium capitalize transition-colors',
                  (filters.type ?? '') === t
                    ? 'bg-surface text-fg shadow-card'
                    : 'text-fg-3 hover:text-fg',
                )}
              >
                {t || 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Category" srOnlyLabel>
            {(a) => (
              <Select
                {...a}
                value={filters.categoryId ?? ''}
                onChange={(e) => update({ categoryId: e.target.value })}
              >
                <option value="">All categories</option>
                {visibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Account" srOnlyLabel>
            {(a) => (
              <Select
                {...a}
                value={filters.accountId ?? ''}
                onChange={(e) => update({ accountId: e.target.value })}
              >
                <option value="">All accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="From date" srOnlyLabel>
            {(a) => (
              <Input
                {...a}
                type="date"
                value={filters.from ?? ''}
                max={filters.to}
                onChange={(e) => update({ from: e.target.value })}
                title="From date"
              />
            )}
          </Field>
          <Field label="To date" srOnlyLabel>
            {(a) => (
              <Input
                {...a}
                type="date"
                value={filters.to ?? ''}
                min={filters.from}
                onChange={(e) => update({ to: e.target.value })}
                title="To date"
              />
            )}
          </Field>
          <Field label="Sort by" srOnlyLabel>
            {(a) => (
              <Select
                {...a}
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                {TRANSACTION_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button
            variant="ghost"
            leftIcon={<FilterX className="h-4 w-4" />}
            disabled={!active}
            onClick={() => {
              setSearch('');
              clear();
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isPending ? (
          <SkeletonRows rows={8} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : data.data.length === 0 ? (
          active ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No matching transactions"
              description="Try a different search or widen the date range."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    clear();
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Receipt className="h-5 w-5" />}
              title="No transactions yet"
              description="Everything you record will show up here."
              action={
                <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  Add transaction
                </Button>
              }
            />
          )
        ) : (
          <div
            className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
            aria-busy={isPlaceholderData}
          >
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <caption className="sr-only">Transactions</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-left text-xs font-medium uppercase tracking-wide text-fg-3">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Account
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">
                    Amount
                  </th>
                  <th scope="col" className="w-24 px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((tx) => (
                  <tr key={tx.id} className="group transition-colors hover:bg-surface-2/60">
                    <td className="tabular whitespace-nowrap px-5 py-3 text-fg-2">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <CategoryIcon icon={tx.category.icon} color={tx.category.color} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">
                            {tx.note || tx.category.name}
                          </p>
                          <p className="truncate text-xs text-fg-3">
                            {tx.category.name}
                            {tx.tags.length > 0 && <> · {tx.tags.map((t) => `#${t}`).join(' ')}</>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-fg-2">{tx.account.name}</td>
                    <td className="px-3 py-3 text-right font-semibold">
                      <Money value={tx.amount} type={tx.type} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${tx.note || tx.category.name}`}
                          onClick={() => openEdit(tx)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${tx.note || tx.category.name}`}
                          onClick={() => setPendingDelete(tx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="divide-y divide-line px-4 md:hidden">
              {data.data.map((tx) => (
                <li key={tx.id} className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <TransactionItem tx={tx} onClick={() => openEdit(tx)} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${tx.note || tx.category.name}`}
                    onClick={() => setPendingDelete(tx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm sm:flex-row">
              <p className="tabular text-fg-3" aria-live="polite">
                Showing{' '}
                <span className="font-medium text-fg-2">
                  {start}–{end}
                </span>{' '}
                of <span className="font-medium text-fg-2">{meta!.total}</span>
              </p>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="page-size">
                  Rows per page
                </label>
                <Select
                  id="page-size"
                  className="h-8 w-auto py-0 text-[13px]"
                  value={filters.limit}
                  onChange={(e) => update({ limit: e.target.value })}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Previous page"
                  disabled={meta!.page <= 1}
                  onClick={() => update({ page: meta!.page - 1 }, false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="tabular min-w-16 text-center text-[13px] text-fg-2">
                  {meta!.page} / {meta!.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Next page"
                  disabled={meta!.page >= meta!.totalPages}
                  onClick={() => update({ page: meta!.page + 1 }, false)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete transaction?"
        message={
          pendingDelete && (
            <>
              <strong className="text-fg">
                {pendingDelete.note || pendingDelete.category.name}
              </strong>{' '}
              on {formatDate(pendingDelete.date)} will be permanently removed. Balances and budgets
              update immediately.
            </>
          )
        }
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}

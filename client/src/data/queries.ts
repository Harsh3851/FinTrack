import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TransactionFilters } from '@fintrack/shared';
import { dataSource } from './index';

export const queryKeys = {
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: (filters: TransactionFilters) => ['transactions', filters] as const,
  budgets: (month: string) => ['budgets', month] as const,
  summary: (month: string) => ['summary', month] as const,
};

export const useAccounts = () =>
  useQuery({ queryKey: queryKeys.accounts, queryFn: dataSource.accounts.list });

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: dataSource.categories.list });

export const useTransactions = (filters: TransactionFilters) =>
  useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => dataSource.transactions.list(filters),
    placeholderData: keepPreviousData,
  });

export const useBudgets = (month: string) =>
  useQuery({ queryKey: queryKeys.budgets(month), queryFn: () => dataSource.budgets.list(month) });

export const useSummary = (month: string) =>
  useQuery({
    queryKey: queryKeys.summary(month),
    queryFn: () => dataSource.dashboard.summary(month),
    placeholderData: keepPreviousData,
  });

/**
 * Every write can move balances, budgets and dashboard totals at once, so a
 * successful mutation invalidates all cached reads (cheap at this data size).
 */
export function useDataMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

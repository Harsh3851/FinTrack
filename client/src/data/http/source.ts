import type {
  Account,
  AuthResponse,
  BudgetStatus,
  Category,
  DashboardSummary,
  Paginated,
  Transaction,
  TransactionFilters,
  User,
} from '@fintrack/shared';
import { csvFileName } from '@fintrack/shared';
import type { DataSource } from '../types';
import { HttpClient } from './client';

export function toQueryString(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createHttpSource(baseUrl: string): DataSource & { client: HttpClient } {
  const client = new HttpClient(baseUrl);
  const session = async (promise: Promise<AuthResponse>) => {
    const res = await promise;
    client.setAccessToken(res.accessToken);
    return res;
  };
  const data = <T>(promise: Promise<{ data: T }>) => promise.then((r) => r.data);

  return {
    mode: 'api',
    client,
    auth: {
      register: (input) =>
        session(client.request('/auth/register', { method: 'POST', json: input })),
      login: (input) => session(client.request('/auth/login', { method: 'POST', json: input })),
      demo: () => session(client.request('/auth/demo', { method: 'POST' })),
      restore: async (): Promise<User | null> => (await client.refresh())?.user ?? null,
      logout: async () => {
        await client.request('/auth/logout', { method: 'POST' }).catch(() => undefined);
        client.setAccessToken(null);
      },
    },
    accounts: {
      list: () => data<Account[]>(client.request('/accounts')),
      create: (input) =>
        data<Account>(client.request('/accounts', { method: 'POST', json: input })),
      update: (id, input) =>
        data<Account>(client.request(`/accounts/${id}`, { method: 'PATCH', json: input })),
      remove: (id) => client.request(`/accounts/${id}`, { method: 'DELETE' }),
    },
    categories: {
      list: () => data<Category[]>(client.request('/categories')),
      create: (input) =>
        data<Category>(client.request('/categories', { method: 'POST', json: input })),
      update: (id, input) =>
        data<Category>(client.request(`/categories/${id}`, { method: 'PATCH', json: input })),
      remove: (id) => client.request(`/categories/${id}`, { method: 'DELETE' }),
    },
    transactions: {
      list: (filters) =>
        client.request<Paginated<Transaction>>(`/transactions${toQueryString(filters)}`),
      create: (input) =>
        data<Transaction>(client.request('/transactions', { method: 'POST', json: input })),
      update: (id, input) =>
        data<Transaction>(client.request(`/transactions/${id}`, { method: 'PATCH', json: input })),
      remove: (id) => client.request(`/transactions/${id}`, { method: 'DELETE' }),
      exportCsv: async (filters: TransactionFilters) => {
        const { page: _p, limit: _l, ...rest } = filters;
        const res = await client.request<Response>(`/transactions/export${toQueryString(rest)}`, {
          raw: true,
        });
        return { blob: await res.blob(), fileName: csvFileName(rest.from, rest.to) };
      },
    },
    budgets: {
      list: (month) => data<BudgetStatus[]>(client.request(`/budgets?month=${month}`)),
      upsert: (categoryId, amount, month) =>
        data<BudgetStatus>(
          client.request(`/budgets/${categoryId}?month=${month}`, {
            method: 'PUT',
            json: { amount },
          }),
        ),
      remove: (categoryId) => client.request(`/budgets/${categoryId}`, { method: 'DELETE' }),
    },
    dashboard: {
      summary: (month) =>
        data<DashboardSummary>(client.request(`/dashboard/summary?month=${month}`)),
    },
  };
}

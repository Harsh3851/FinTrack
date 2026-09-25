import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import type { Account, BudgetStatus, Category } from '@fintrack/shared';
import { Money } from '../components/Money';
import { BudgetRow } from '../components/BudgetRow';
import { TransactionForm } from '../components/TransactionForm';
import { queryKeys } from '../data/queries';
import { renderWithProviders } from './utils';

const now = new Date().toISOString();
const categories: Category[] = [
  {
    id: 'c'.repeat(24),
    name: 'Food & Dining',
    type: 'expense',
    icon: 'utensils',
    color: '#eb6834',
    transactionCount: 0,
    createdAt: now,
  },
  {
    id: 'd'.repeat(24),
    name: 'Salary',
    type: 'income',
    icon: 'briefcase',
    color: '#2a78d6',
    transactionCount: 0,
    createdAt: now,
  },
];
const accounts: Account[] = [
  {
    id: 'a'.repeat(24),
    name: 'HDFC Savings',
    type: 'bank',
    color: '#2a78d6',
    openingBalance: 0,
    balance: 0,
    transactionCount: 0,
    createdAt: now,
  },
];

describe('Money', () => {
  it('uses Indian digit grouping and signs by type', () => {
    renderWithProviders(
      <>
        <Money value={12_345_600} type="income" />
        <Money value={45_050} type="expense" />
      </>,
    );
    expect(screen.getByText('+₹1,23,456.00')).toBeInTheDocument();
    expect(screen.getByText('-₹450.50')).toBeInTheDocument();
  });
});

describe('BudgetRow', () => {
  it('warns when a budget is exceeded', () => {
    const budget: BudgetStatus = {
      id: 'b'.repeat(24),
      category: { id: 'c'.repeat(24), name: 'Shopping', icon: 'shopping-bag', color: '#008300' },
      amount: 600_000,
      spent: 750_000,
      remaining: -150_000,
      ratio: 1.25,
      state: 'over',
    };
    renderWithProviders(<BudgetRow budget={budget} />);
    expect(screen.getByText(/Over by ₹1,500/)).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: /Shopping budget used/ });
    expect(bar).toHaveAttribute('aria-valuenow', '125');
  });
});

describe('TransactionForm', () => {
  function setup() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    client.setQueryData(queryKeys.categories, categories);
    client.setQueryData(queryKeys.accounts, accounts);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <TransactionForm submitLabel="Add transaction" onSubmit={onSubmit} onCancel={() => {}} />,
      { client },
    );
    return { onSubmit, user: userEvent.setup() };
  }

  it('shows accessible validation errors', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(await screen.findByText('Enter an amount')).toBeInTheDocument();
    expect(screen.getByText('Pick a category')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount (₹)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Amount (₹)'), '12.345');
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(await screen.findByText('Use a number with up to 2 decimals')).toBeInTheDocument();
  });

  it('only offers categories matching the type and submits paise', async () => {
    const { onSubmit, user } = setup();
    const category = screen.getByLabelText('Category');
    expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Amount (₹)'), '1,250.50');
    await user.selectOptions(category, categories[0]!.id);
    await user.type(screen.getByLabelText('Note'), 'Team dinner');
    await user.type(screen.getByLabelText('Tags'), 'Work, friends');
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        amount: 125_050,
        categoryId: categories[0]!.id,
        accountId: accounts[0]!.id,
        note: 'Team dinner',
        tags: ['work', 'friends'],
      }),
    );

    await user.click(screen.getByText('income'));
    expect(screen.getByRole('option', { name: 'Salary' })).toBeInTheDocument();
  });
});

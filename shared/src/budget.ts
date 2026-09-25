import { BUDGET_WARNING_RATIO } from './constants';
import type { BudgetState } from './types';

export function budgetState(spent: number, limit: number): BudgetState {
  if (limit <= 0) return 'ok';
  const ratio = spent / limit;
  if (ratio > 1) return 'over';
  if (ratio >= BUDGET_WARNING_RATIO) return 'warning';
  return 'ok';
}

export function budgetFigures(spent: number, limit: number) {
  return {
    spent,
    remaining: limit - spent,
    ratio: limit > 0 ? spent / limit : 0,
    state: budgetState(spent, limit),
  };
}

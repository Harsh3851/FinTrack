import { AlertTriangle, CheckCircle2, OctagonAlert } from 'lucide-react';
import type { BudgetStatus } from '@fintrack/shared';
import { formatINR } from '@fintrack/shared';
import { CategoryIcon } from './CategoryIcon';
import { Progress } from './ui/Progress';
import { Badge } from './ui/Badge';

export function BudgetStateBadge({ budget }: { budget: BudgetStatus }) {
  if (budget.state === 'over') {
    return (
      <Badge tone="danger">
        <OctagonAlert className="h-3 w-3" aria-hidden /> Over by{' '}
        {formatINR(-budget.remaining, { whole: true })}
      </Badge>
    );
  }
  if (budget.state === 'warning') {
    return (
      <Badge tone="warning">
        <AlertTriangle className="h-3 w-3" aria-hidden /> {Math.round(budget.ratio * 100)}% used
      </Badge>
    );
  }
  return (
    <Badge tone="income">
      <CheckCircle2 className="h-3 w-3" aria-hidden /> On track
    </Badge>
  );
}

export function BudgetRow({ budget, action }: { budget: BudgetStatus; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <CategoryIcon icon={budget.category.icon} color={budget.category.color} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="min-w-0 truncate text-sm font-medium text-fg">{budget.category.name}</p>
          <BudgetStateBadge budget={budget} />
        </div>
        <div className="mt-2">
          <Progress
            ratio={budget.ratio}
            state={budget.state}
            label={`${budget.category.name} budget used`}
          />
        </div>
        <p className="tabular mt-1.5 text-xs text-fg-3">
          <span className="font-medium text-fg-2">{formatINR(budget.spent, { whole: true })}</span>{' '}
          of {formatINR(budget.amount, { whole: true })}
          {budget.remaining >= 0 && <> · {formatINR(budget.remaining, { whole: true })} left</>}
        </p>
      </div>
      {action}
    </div>
  );
}

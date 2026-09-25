import type { BudgetState } from '@fintrack/shared';
import { cn } from '../../lib/cn';

const fills: Record<BudgetState, string> = {
  ok: 'bg-primary',
  warning: 'bg-warning',
  over: 'bg-danger',
};

export function Progress({
  ratio,
  state,
  label,
}: {
  ratio: number;
  state: BudgetState;
  label: string;
}) {
  const pct = Math.min(100, Math.round(ratio * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fills[state])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

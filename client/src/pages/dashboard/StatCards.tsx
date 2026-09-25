import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { DashboardSummary } from '@fintrack/shared';
import { formatINR } from '@fintrack/shared';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../lib/cn';

function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

function Delta({ value, goodWhenUp }: { value: number | null; goodWhenUp: boolean }) {
  if (value === null || !Number.isFinite(value))
    return <span className="text-xs text-fg-3">No data last month</span>;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 text-xs">
      <span
        className={cn(
          'inline-flex items-center font-semibold',
          good ? 'text-income' : 'text-danger',
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {Math.abs(value * 100).toFixed(1)}%
      </span>
      <span className="text-fg-3">vs last month</span>
    </span>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  footer,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
  footer: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-fg-3">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone)}>
          {icon}
        </span>
      </div>
      <p className="tabular mt-3 truncate text-[17px] font-semibold tracking-tight text-fg sm:text-2xl">
        {value}
      </p>
      <div className="mt-1.5">{footer}</div>
    </Card>
  );
}

export function StatCards({ summary }: { summary: DashboardSummary }) {
  const { totals, previousTotals } = summary;
  const savingsRate = totals.income > 0 ? totals.net / totals.income : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Stat
        label="Income"
        value={formatINR(totals.income)}
        icon={<TrendingUp className="h-4 w-4" aria-hidden />}
        tone="bg-income-soft text-income"
        footer={<Delta value={change(totals.income, previousTotals.income)} goodWhenUp />}
      />
      <Stat
        label="Expenses"
        value={formatINR(totals.expense)}
        icon={<TrendingDown className="h-4 w-4" aria-hidden />}
        tone="bg-expense-soft text-expense"
        footer={<Delta value={change(totals.expense, previousTotals.expense)} goodWhenUp={false} />}
      />
      <Stat
        label="Net savings"
        value={formatINR(totals.net)}
        icon={<PiggyBank className="h-4 w-4" aria-hidden />}
        tone="bg-primary-soft text-primary"
        footer={
          <span className="text-xs text-fg-3">
            {totals.income > 0
              ? `${Math.round(savingsRate * 100)}% of income saved`
              : 'No income recorded yet'}
          </span>
        }
      />
      <Stat
        label="Total balance"
        value={formatINR(summary.netWorth)}
        icon={<Landmark className="h-4 w-4" aria-hidden />}
        tone="bg-surface-2 text-fg-2"
        footer={<span className="text-xs text-fg-3">Across all accounts, today</span>}
      />
    </div>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-4 h-7 w-36" />
          <Skeleton className="mt-3 h-3 w-28" />
        </Card>
      ))}
    </div>
  );
}

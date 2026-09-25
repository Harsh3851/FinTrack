import type { TransactionType } from '@fintrack/shared';
import { formatINR } from '@fintrack/shared';
import { cn } from '../lib/cn';

/** Renders paise as ₹1,23,456.00. With `type`, income is green with "+", expense gets "-". */
export function Money({
  value,
  type,
  className,
  whole,
}: {
  value: number;
  type?: TransactionType;
  className?: string;
  whole?: boolean;
}) {
  const text = formatINR(value, { whole });
  return (
    <span
      className={cn('tabular whitespace-nowrap', type === 'income' && 'text-income', className)}
    >
      {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
      {text}
    </span>
  );
}

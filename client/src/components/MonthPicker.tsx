import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentMonthKey, formatMonth, shiftMonth } from '@fintrack/shared';

export function MonthPicker({ value, onChange }: { value: string; onChange(month: string): void }) {
  const isCurrent = value >= currentMonthKey();
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-surface shadow-card">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-l-lg text-fg-2 hover:bg-surface-2"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-24 px-1 text-center text-sm font-medium text-fg" aria-live="polite">
        {formatMonth(value)}
      </span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-r-lg text-fg-2 hover:bg-surface-2 disabled:opacity-40"
        onClick={() => onChange(shiftMonth(value, 1))}
        disabled={isCurrent}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

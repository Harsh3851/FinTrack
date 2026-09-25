import type { Transaction } from '@fintrack/shared';
import { formatDate } from '@fintrack/shared';
import { CategoryIcon } from './CategoryIcon';
import { Money } from './Money';

/** Compact list row used on the dashboard and on narrow screens. */
export function TransactionItem({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  const content = (
    <>
      <CategoryIcon icon={tx.category.icon} color={tx.category.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{tx.note || tx.category.name}</p>
        <p className="truncate text-xs text-fg-3">
          {tx.category.name} · {tx.account.name} · {formatDate(tx.date)}
        </p>
      </div>
      <Money value={tx.amount} type={tx.type} className="text-sm font-semibold" />
    </>
  );
  if (!onClick) return <div className="flex items-center gap-3 py-2.5">{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
    >
      {content}
    </button>
  );
}

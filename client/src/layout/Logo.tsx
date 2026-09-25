import { cn } from '../lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        <path
          d="M9 21.5l5-5 3.5 3.5L23 13"
          fill="none"
          stroke="var(--primary-fg)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 13h4v4"
          fill="none"
          stroke="var(--primary-fg)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight text-fg">FinTrack</span>
    </span>
  );
}

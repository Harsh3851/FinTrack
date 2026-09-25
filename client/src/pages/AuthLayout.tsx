import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '../layout/Logo';
import { DemoBanner } from '../components/DemoBanner';
import { ThemeToggle } from '../components/ThemeToggle';

const POINTS = [
  'Income, expenses and account balances in one place',
  'Monthly budgets that warn you before you overspend',
  'Trends and category breakdowns, exportable to CSV',
];

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <div className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden overflow-hidden bg-[#0f1b33] p-12 text-white lg:flex lg:flex-col">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#2563eb] opacity-40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[#1baf7a] opacity-20 blur-3xl"
          />
          <div className="relative flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
              <rect width="32" height="32" rx="9" fill="#fff" />
              <path
                d="M9 21.5l5-5 3.5 3.5L23 13"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 13h4v4"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-lg font-semibold">FinTrack</span>
          </div>
          <div className="relative mt-auto max-w-md">
            <h2 className="text-[34px] font-semibold leading-tight tracking-tight">
              Know where every rupee goes.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/70">
              A calm, fast personal finance tracker built for Indian Rupees - lakh and crore
              formatting included.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-white/85">
                  <CheckCircle2
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#4ade80]"
                    aria-hidden
                  />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative mt-12 text-xs text-white/45">
            React · Node.js · Express · MongoDB · TypeScript
          </p>
        </section>

        <section className="flex flex-col px-4 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <span className="lg:invisible">
              <Logo />
            </span>
            <ThemeToggle />
          </div>
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            <p className="mt-1.5 text-sm text-fg-3">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

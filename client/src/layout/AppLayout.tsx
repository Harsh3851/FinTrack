import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Layers,
  LayoutDashboard,
  LogOut,
  Plus,
  RotateCcw,
  Target,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { dataSource } from '../data';
import { DemoBanner } from '../components/DemoBanner';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/Button';
import { useTransactionDialog } from '../components/TransactionDialog';
import { cn } from '../lib/cn';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/categories', label: 'Categories', icon: Layers },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function UserMenu({ compact }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const resetDemo = async () => {
    setOpen(false);
    await dataSource.resetDemo?.();
    await queryClient.invalidateQueries();
    toast.success('Demo data restored');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-surface-2',
          compact ? 'p-1' : 'p-2',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-fg">
          {initials(user.name)}
        </span>
        {!compact && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-fg">{user.name}</span>
            <span className="block truncate text-xs text-fg-3">{user.email}</span>
          </span>
        )}
        <span className="sr-only">Open account menu</span>
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'animate-pop-in absolute z-40 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop',
            compact ? 'right-0 top-11' : 'bottom-14 left-0',
          )}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-fg">{user.name}</p>
            <p className="truncate text-xs text-fg-3">{user.email}</p>
          </div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[13px] text-fg-2">Theme</span>
            <ThemeToggle />
          </div>
          <div className="my-1 h-px bg-line" />
          {dataSource.mode === 'demo' && user.isDemo && (
            <button
              role="menuitem"
              type="button"
              onClick={resetDemo}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-fg-2 hover:bg-surface-2 hover:text-fg"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset demo data
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-fg-2 hover:bg-surface-2 hover:text-fg"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { openCreate } = useTransactionDialog();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop"
      >
        Skip to content
      </a>
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
          <Logo className="px-2" />
          <Button
            className="mt-6 w-full"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add transaction
          </Button>
          <nav aria-label="Main" className="mt-6 flex flex-col gap-0.5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                  )
                }
              >
                <Icon className="h-4.5 w-4.5" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-line pt-3">
            <UserMenu />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <DemoBanner />
          {/* Mobile / tablet top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/85 px-4 backdrop-blur lg:hidden">
            <Logo />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={openCreate}
                aria-label="Add transaction"
              >
                <span className="hidden sm:inline">Add</span>
              </Button>
              <UserMenu compact />
            </div>
          </header>

          <main
            id="main"
            className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8"
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2 text-[10.5px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-fg-3',
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

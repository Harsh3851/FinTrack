import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PieChart, Plus, Receipt, Target } from 'lucide-react';
import { currentMonthKey, formatMonth } from '@fintrack/shared';
import { useSummary } from '../data/queries';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { MonthPicker } from '../components/MonthPicker';
import { Card, CardHeader } from '../components/ui/Card';
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Button, buttonStyles } from '../components/ui/Button';
import { TransactionItem } from '../components/TransactionItem';
import { BudgetRow } from '../components/BudgetRow';
import { useTransactionDialog } from '../components/TransactionDialog';
import { StatCards, StatCardsSkeleton } from './dashboard/StatCards';
import { TrendChart, TrendLegend } from './dashboard/TrendChart';
import { SpendingDonut } from './dashboard/SpendingDonut';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonthKey);
  const { data, isPending, isError, error, refetch } = useSummary(month);
  const { openCreate, openEdit } = useTransactionDialog();

  const hasTrend = data?.trend.some((t) => t.income > 0 || t.expense > 0);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        description={`Here is how ${formatMonth(month)} is going.`}
        actions={<MonthPicker value={month} onChange={setMonth} />}
      />

      {isError ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-5">
          {isPending ? <StatCardsSkeleton /> : <StatCards summary={data} />}

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Income vs expenses"
                description="Last 12 months"
                action={<TrendLegend />}
              />
              <div className="px-2 pb-4 pt-4 sm:px-4">
                {isPending ? (
                  <Skeleton className="mx-3 h-72" />
                ) : hasTrend ? (
                  <TrendChart data={data.trend} />
                ) : (
                  <EmptyState
                    icon={<Receipt className="h-5 w-5" />}
                    title="No activity yet"
                    description="Add your first transaction to see monthly trends."
                  />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Spending by category" description={formatMonth(month)} />
              <div className="p-5">
                {isPending ? (
                  <div className="flex flex-col items-center gap-5">
                    <Skeleton className="h-44 w-44 rounded-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ) : data.spendingByCategory.length ? (
                  <SpendingDonut slices={data.spendingByCategory} />
                ) : (
                  <EmptyState
                    icon={<PieChart className="h-5 w-5" />}
                    title="No spending this month"
                    description="Expenses you add will be broken down here."
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Recent transactions"
                action={
                  <Link
                    to="/transactions"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                  >
                    View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                }
              />
              {isPending ? (
                <SkeletonRows rows={5} />
              ) : data.recent.length ? (
                <div className="divide-y divide-line px-5 pb-3 pt-2">
                  {data.recent.map((tx) => (
                    <TransactionItem key={tx.id} tx={tx} onClick={() => openEdit(tx)} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Receipt className="h-5 w-5" />}
                  title="No transactions yet"
                  description="Record your salary, rent or today's coffee to get started."
                  action={
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                      Add transaction
                    </Button>
                  }
                />
              )}
            </Card>

            <Card>
              <CardHeader
                title="Budgets"
                description={formatMonth(month)}
                action={
                  <Link
                    to="/budgets"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                  >
                    Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                }
              />
              {isPending ? (
                <SkeletonRows rows={4} />
              ) : data.budgets.length ? (
                <div className="divide-y divide-line px-5 pb-2 pt-1">
                  {data.budgets.slice(0, 5).map((b) => (
                    <BudgetRow key={b.id} budget={b} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Target className="h-5 w-5" />}
                  title="No budgets set"
                  description="Set monthly limits and FinTrack will warn you before you overspend."
                  action={
                    <Link to="/budgets" className={buttonStyles('secondary', 'sm')}>
                      Set a budget
                    </Link>
                  }
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

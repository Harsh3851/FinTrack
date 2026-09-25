import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '@fintrack/shared';
import { formatCompactINR, formatINR, formatMonth } from '@fintrack/shared';
import { useChartTheme } from './chartTheme';

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: string | number; value?: number; color?: string }[];
}

function TrendTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const income = Number(payload.find((p) => p.dataKey === 'income')?.value ?? 0);
  const expense = Number(payload.find((p) => p.dataKey === 'expense')?.value ?? 0);
  return (
    <div className="min-w-44 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-semibold text-fg">{formatMonth(String(label))}</p>
      {payload.map((p) => (
        <p
          key={String(p.dataKey)}
          className="flex items-center justify-between gap-4 py-0.5 text-fg-2"
        >
          <span className="flex items-center gap-1.5 capitalize">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {String(p.dataKey)}
          </span>
          <span className="tabular font-medium text-fg">{formatINR(Number(p.value ?? 0))}</span>
        </p>
      ))}
      <p className="mt-1.5 flex justify-between gap-4 border-t border-line pt-1.5 text-fg-2">
        <span>Net</span>
        <span className="tabular font-semibold text-fg">{formatINR(income - expense)}</span>
      </p>
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const c = useChartTheme();
  return (
    <div
      className="h-72 w-full lg:h-[23rem]"
      role="img"
      aria-label="Bar chart of income and expenses for the last 12 months"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="22%"
        >
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="month"
            tickFormatter={(m: string) => formatMonth(m, true)}
            tick={{ fill: c.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: c.grid }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactINR(v)}
            tick={{ fill: c.axis, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
          <Bar
            dataKey="income"
            name="Income"
            fill={c.income}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
          <Bar
            dataKey="expense"
            name="Expense"
            fill={c.expense}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLegend() {
  const c = useChartTheme();
  return (
    <div className="flex items-center gap-4 text-xs text-fg-2">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.income }} /> Income
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.expense }} /> Expense
      </span>
    </div>
  );
}

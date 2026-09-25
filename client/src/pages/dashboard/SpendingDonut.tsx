import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySlice } from '@fintrack/shared';
import { formatCompactINR, formatINR } from '@fintrack/shared';
import { useChartTheme } from './chartTheme';

const MAX_SLICES = 5;

interface Slice {
  name: string;
  value: number;
  color: string;
}

export function groupSlices(slices: CategorySlice[], otherColor: string): Slice[] {
  const top = slices
    .slice(0, MAX_SLICES)
    .map((s) => ({ name: s.category.name, value: s.amount, color: s.category.color }));
  const rest = slices.slice(MAX_SLICES).reduce((sum, s) => sum + s.amount, 0);
  return rest > 0 ? [...top, { name: 'Other', value: rest, color: otherColor }] : top;
}

function SliceTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { payload?: Slice }[];
  total: number;
}) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="font-semibold text-fg">{slice.name}</p>
      <p className="tabular text-fg-2">
        {formatINR(slice.value)} · {((slice.value / total) * 100).toFixed(1)}%
      </p>
    </div>
  );
}

export function SpendingDonut({ slices }: { slices: CategorySlice[] }) {
  const c = useChartTheme();
  const data = groupSlices(slices, c.other);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
      <div
        className="relative h-48 w-48 shrink-0"
        role="img"
        aria-label="Donut chart of spending by category"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={1}
              stroke={c.surface}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-fg-3">Spent</span>
          <span className="tabular text-lg font-semibold text-fg">{formatCompactINR(total)}</span>
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-2.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: d.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-fg-2">{d.name}</span>
            <span className="tabular font-medium text-fg">
              {formatINR(d.value, { whole: true })}
            </span>
            <span className="tabular w-11 text-right text-xs text-fg-3">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

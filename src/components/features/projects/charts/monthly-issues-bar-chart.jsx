'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
  color: 'var(--card-foreground)',
};

/**
 * Monthly issue breakdown by status (open, closed, transferred).
 * @param {{ data: {month: string, open: number, closed: number, transferred: number}[], className?: string }} props
 */
export function MonthlyIssuesBarChart({ data, className = 'h-[190px] xl:h-auto xl:min-h-[160px] xl:flex-1' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          allowDecimals={false}
        />
        <Tooltip cursor={{ fill: 'var(--accent)', opacity: 0.5 }} contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="open" name="Open" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar
          dataKey="closed"
          name="Closed"
          fill="var(--chart-2)"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="transferred"
          name="Transferred"
          fill="var(--chart-3)"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

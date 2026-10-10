'use client';

import {
  Area,
  AreaChart,
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
 * Issue trends — cumulative total issues from the first reported issue to
 * the current month.
 * @param {{ data: {month: string, total: number}[] }} props
 */
export function IssueTrendsLineChart({ data }) {
  return (
    <div className="h-[190px] xl:h-auto xl:min-h-[160px] xl:flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="issueTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="total"
          name="Total issues"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#issueTrendFill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

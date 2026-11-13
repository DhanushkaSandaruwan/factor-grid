'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS_TICK, GRID_PROPS, LEGEND_TEXT_STYLE, TOOLTIP_STYLE } from './chart-theme';

const SERIES = [
  { key: 'open', label: 'Open', color: 'var(--status-open)' },
  { key: 'closed', label: 'Closed', color: 'var(--status-closed)' },
  { key: 'transferred', label: 'Transferred', color: 'var(--status-transferred)' },
];

/**
 * Monthly issue breakdown by status (open, closed, transferred).
 * @param {{ data: {month: string, open: number, closed: number, transferred: number}[], className?: string }} props
 */
export function MonthlyIssuesBarChart({ data, className = 'h-[190px] xl:h-auto xl:min-h-[160px] xl:flex-1' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            interval="preserveStartEnd"
          />
          <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6 }} contentStyle={TOOLTIP_STYLE} />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ paddingTop: 4 }}
            formatter={(value) => <span style={LEGEND_TEXT_STYLE}>{value}</span>}
          />
          {SERIES.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              fill={series.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

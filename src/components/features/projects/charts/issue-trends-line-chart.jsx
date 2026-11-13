'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS_TICK, GRID_PROPS, TOOLTIP_STYLE } from './chart-theme';

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
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS_TICK} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'var(--border)' }} />
          <Area
            type="monotone"
            dataKey="total"
            name="Total issues"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#issueTrendFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

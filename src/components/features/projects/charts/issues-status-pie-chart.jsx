'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '0.75rem',
  color: 'var(--card-foreground)',
};

const STATUS_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];

/**
 * Issues report — status distribution (open, closed, transferred).
 * @param {{ data: {name: string, value: number}[], className?: string }} props
 */
export function IssuesStatusPieChart({ data, className = 'h-[190px] xl:h-auto xl:min-h-[160px] xl:flex-1' }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{value}</span>
          )}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

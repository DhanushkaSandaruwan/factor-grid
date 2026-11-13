'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { LEGEND_TEXT_STYLE, TOOLTIP_STYLE } from './chart-theme';

const STATUS_COLORS = ['var(--status-open)', 'var(--status-closed)', 'var(--status-transferred)'];

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
            iconSize={7}
            formatter={(value) => <span style={LEGEND_TEXT_STYLE}>{value}</span>}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={3}
            cornerRadius={4}
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

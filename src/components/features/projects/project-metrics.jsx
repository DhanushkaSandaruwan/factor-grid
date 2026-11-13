import { CircleDot, ClipboardList, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat';

/**
 * Project metrics — status count tiles plus one card per attribute group
 * with issue counts for the attributes selected in the project. Laid out
 * for a narrow column on the project view page.
 * @param {{ analytics: object }} props
 */
export function ProjectMetrics({ analytics }) {
  const statusCards = [
    { label: 'Total issues', value: analytics.statusCounts.total, icon: ClipboardList, tone: 'primary' },
    { label: 'Open', value: analytics.statusCounts.open, icon: CircleDot, tone: 'open' },
    { label: 'Closed', value: analytics.statusCounts.closed, icon: CheckCircle2, tone: 'closed' },
    { label: 'Transferred', value: analytics.statusCounts.transferred, icon: ArrowRightLeft, tone: 'transferred' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        {statusCards.map(({ label, value, icon, tone }) => (
          <StatTile key={label} label={label} value={value} icon={icon} tone={tone} />
        ))}
      </div>

      {analytics.attributeCounts.map(({ group, counts }) => (
        <Card key={group} className="[--card-spacing:--spacing(4)]">
          <CardHeader>
            <CardTitle>{group}</CardTitle>
            <CardDescription className="text-xs">
              Issue counts for the attributes selected in this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {counts.map(({ name, count }) => (
                <div
                  key={name}
                  className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 text-sm"
                >
                  <dt className="text-muted-foreground truncate">{name}</dt>
                  <dd className="font-mono font-semibold tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

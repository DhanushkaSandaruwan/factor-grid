import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Project metrics — status count cards plus per-attribute issue counts
 * for the attributes selected in the project. Laid out for a narrow
 * column on the project view page.
 * @param {{ analytics: object }} props
 */
export function ProjectMetrics({ analytics }) {
  const statusCards = [
    { label: 'Total issues', value: analytics.statusCounts.total },
    { label: 'Open', value: analytics.statusCounts.open },
    { label: 'Closed', value: analytics.statusCounts.closed },
    { label: 'Transferred', value: analytics.statusCounts.transferred },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statusCards.map(({ label, value }) => (
          <Card key={label} className="shadow-enterprise [--card-spacing:--spacing(3)]">
            <CardContent className="space-y-1">
              <p className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-wide">
                {label}
              </p>
              <p className="text-xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics.attributeCounts.length > 0 && (
        <Card className="shadow-enterprise [--card-spacing:--spacing(4)]">
          <CardHeader>
            <CardTitle>Issues by attribute</CardTitle>
            <CardDescription className="text-xs">
              Issue counts for the attributes selected in this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.attributeCounts.map(({ group, counts }) => (
              <div key={group} className="space-y-2">
                <p className="text-sm font-medium">{group}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {counts.map(({ name, count }) => (
                    <div key={name} className="flex items-center justify-between gap-2 text-sm">
                      <dt className="text-muted-foreground truncate">{name}</dt>
                      <dd className="font-semibold tabular-nums">{count}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

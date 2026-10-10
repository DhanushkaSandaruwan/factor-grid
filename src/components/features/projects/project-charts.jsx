import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyIssuesBarChart } from './charts/monthly-issues-bar-chart';
import { IssuesStatusPieChart } from './charts/issues-status-pie-chart';

/**
 * Project status charts — monthly issue breakdown (bar) and issues report
 * (pie). The cards flex to fill the column height on xl+ screens so the
 * page fits the viewport without scrolling.
 * @param {{ analytics: object }} props
 */
export function ProjectCharts({ analytics }) {
  const pieData = [
    { name: 'Open', value: analytics.statusCounts.open },
    { name: 'Closed', value: analytics.statusCounts.closed },
    { name: 'Transferred', value: analytics.statusCounts.transferred },
  ];

  return (
    <div className="flex flex-col gap-4 xl:min-h-0 xl:flex-1">
      <Card className="shadow-enterprise xl:min-h-0 xl:flex-1 [--card-spacing:--spacing(3)]">
        <CardHeader>
          <CardTitle>Monthly Issue Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Issues reported per month, by status.
          </CardDescription>
        </CardHeader>
        <CardContent className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <MonthlyIssuesBarChart data={analytics.monthlyBreakdown} />
        </CardContent>
      </Card>

      <Card className="shadow-enterprise xl:min-h-0 xl:flex-1 [--card-spacing:--spacing(3)]">
        <CardHeader>
          <CardTitle>Issues Report</CardTitle>
          <CardDescription className="text-xs">Share of issues by current status.</CardDescription>
        </CardHeader>
        <CardContent className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <IssuesStatusPieChart data={pieData} />
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IssueTrendsLineChart } from './charts/issue-trends-line-chart';

/**
 * Issue trends card — cumulative total issues from the first reported
 * issue to the current month. Fills the row height on xl+ screens.
 * @param {{ analytics: object }} props
 */
export function ProjectTrendCard({ analytics }) {
  return (
    <Card className="shadow-project xl:min-h-0 [--card-spacing:--spacing(3)]">
      <CardHeader>
        <CardTitle>Issue Trends (Total: {analytics.statusCounts.total})</CardTitle>
        <CardDescription className="text-xs">
          Cumulative issues from the first reported issue to the current month.
        </CardDescription>
      </CardHeader>
      <CardContent className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
        <IssueTrendsLineChart data={analytics.trend} />
      </CardContent>
    </Card>
  );
}

import { Activity, Archive, CheckCircle2, ClipboardList, FolderKanban, Layers, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat';
import { IssuesStatusPieChart } from './charts/issues-status-pie-chart';
import { MonthlyIssuesBarChart } from './charts/monthly-issues-bar-chart';

/** Thin progress row used for the recommendation / requirement flow. */
function FlowBar({ label, value, percent, tone }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold tabular-nums">{value}</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${tone}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Dashboard overview panel — aggregated portfolio statistics and charts
 * covering every project the signed-in user owns or is a member of.
 * @param {{ stats: object }} props
 */
export function DashboardOverview({ stats }) {
  const { projects, issues, monthlyBreakdown } = stats;
  const closedRate = issues.total > 0 ? Math.round((issues.closed / issues.total) * 100) : null;

  const pieData = [
    { name: 'Open', value: issues.open },
    { name: 'Closed', value: issues.closed },
    { name: 'Transferred', value: issues.transferred },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile
          icon={FolderKanban}
          tone="primary"
          label="Projects"
          value={projects.total}
          hint={`${projects.owned} owned · ${projects.joined} joined`}
        />
        <StatTile icon={Layers} tone="accent" label="Packages" value={issues.recommendations} hint="recommendations" />
        <StatTile icon={ClipboardList} tone="accent" label="Issues" value={issues.total} hint={`${issues.open} open`} />
        <StatTile
          icon={CheckCircle2}
          tone="closed"
          label="Closed"
          value={issues.closed}
          hint={closedRate !== null ? `${closedRate}% rate` : undefined}
        />
      </div>

      <Card className="[--card-spacing:--spacing(3)]">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="text-primary size-3.5" />
            Issue status distribution
          </CardTitle>
          <CardDescription className="text-xs">All projects combined</CardDescription>
        </CardHeader>
        <CardContent>
          <IssuesStatusPieChart data={pieData} className="h-[180px]" />
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(3)]">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2">
            <Activity className="text-primary size-3.5" />
            Monthly issue volume
          </CardTitle>
          <CardDescription className="text-xs">New issues reported per month</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyIssuesBarChart data={monthlyBreakdown} className="h-[180px]" />
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(3)]">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2">
            <Archive className="text-primary size-3.5" />
            Issue workflow
          </CardTitle>
          <CardDescription className="text-xs">Recommendations and requirements raised</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FlowBar
            label="Recommendations"
            value={issues.recommendations}
            percent={issues.total > 0 ? (issues.recommendations / issues.total) * 100 : 0}
            tone="bg-chart-1"
          />
          <FlowBar
            label="Requirements"
            value={issues.requirements}
            percent={issues.recommendations > 0 ? (issues.requirements / issues.recommendations) * 100 : 0}
            tone="bg-chart-2"
          />
        </CardContent>
      </Card>
    </div>
  );
}

import {
  Activity,
  Archive,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IssuesStatusPieChart } from './charts/issues-status-pie-chart';
import { MonthlyIssuesBarChart } from './charts/monthly-issues-bar-chart';

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="shadow-enterprise [--card-spacing:--spacing(2.5)]">
      <CardContent className="flex items-center gap-3">
        <div className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <dt className="text-muted-foreground truncate text-[0.68rem] font-medium uppercase tracking-wide">
            {label}
          </dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums">{value}</span>
            {hint && (
              <span className="text-muted-foreground truncate text-[0.65rem]">{hint}</span>
            )}
          </dd>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard overview panel — aggregated portfolio statistics and charts
 * covering every project the signed-in user owns or is a member of.
 * Rendered in the left (1/3-width) column of the dashboard.
 * @param {{ stats: object }} props
 */
export function DashboardOverview({ stats }) {
  const { projects, issues, monthlyBreakdown } = stats;

  const pieData = [
    { name: 'Open', value: issues.open },
    { name: 'Closed', value: issues.closed },
    { name: 'Transferred', value: issues.transferred },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={FolderKanban}
          label="Projects"
          value={projects.total}
          hint={`${projects.owned} owned · ${projects.joined} joined`}
        />
        <StatCard icon={Layers} label="Packages" value={issues.recommendations} hint="recommendations" />
        <StatCard
          icon={ClipboardList}
          label="Issues"
          value={issues.total}
          hint={`${issues.open} open`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Closed"
          value={issues.closed}
          hint={issues.total > 0 ? `${Math.round((issues.closed / issues.total) * 100)}% rate` : undefined}
        />
      </div>

      <Card className="shadow-enterprise [--card-spacing:--spacing(3)]">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="text-muted-foreground size-3.5" />
            Issue Status Distribution
          </CardTitle>
          <CardDescription className="text-xs">All projects combined</CardDescription>
        </CardHeader>
        <CardContent>
          <IssuesStatusPieChart data={pieData} className="h-[180px]" />
        </CardContent>
      </Card>

      <Card className="shadow-enterprise [--card-spacing:--spacing(3)]">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="text-muted-foreground size-3.5" />
            Monthly Issue Volume
          </CardTitle>
          <CardDescription className="text-xs">New issues reported per month</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyIssuesBarChart data={monthlyBreakdown} className="h-[180px]" />
        </CardContent>
      </Card>

      <Card className="shadow-enterprise [--card-spacing:--spacing(3)]">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Archive className="text-muted-foreground size-3.5" />
            Issue Workflow
          </CardTitle>
          <CardDescription className="text-xs">Recommendations and requirements raised</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Recommendations</span>
            <span className="font-semibold tabular-nums">{issues.recommendations}</span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-chart-1 h-full rounded-full"
              style={{
                width: `${issues.total > 0 ? Math.min(100, (issues.recommendations / issues.total) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Requirements</span>
            <span className="font-semibold tabular-nums">{issues.requirements}</span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-chart-2 h-full rounded-full"
              style={{
                width: `${issues.recommendations > 0 ? Math.min(100, (issues.requirements / issues.recommendations) * 100) : 0}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

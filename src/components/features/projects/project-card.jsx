import Link from 'next/link';
import { ClipboardList, Eye, Pencil } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** One labelled figure inside a metric strip. */
function Metric({ label, value, emphasis = false }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="eyebrow truncate text-[0.58rem]">{label}</dt>
      <dd
        className={cn(
          'font-mono text-xs tabular-nums',
          emphasis ? 'text-foreground font-semibold' : 'text-foreground/85 font-medium'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Summary card for a single project on the dashboard, with view and edit
 * actions. Shows the project's attribute/package configuration plus real
 * issue activity stats.
 * @param {{ project: object, issueStats: object|null }} props
 */
export function ProjectCard({ project, issueStats }) {
  const id = String(project._id);
  const configuration = [
    { label: 'HF', value: project.hfAttributes.length },
    { label: 'Risk', value: project.riskAttributes.length },
    { label: 'Action', value: project.actionAttributes.length },
    { label: 'Packages', value: project.packages.length },
  ];
  const activity = [
    { label: 'Issues', value: issueStats?.total ?? 0, emphasis: true },
    { label: 'Open', value: issueStats?.open ?? 0 },
    { label: 'Closed', value: issueStats?.closed ?? 0 },
    { label: 'Recs', value: issueStats?.recommendations ?? 0 },
  ];

  return (
    <Card size="sm" className="group relative flex h-full flex-col gap-2.5 hover:shadow-enterprise-lg">
      {/* Accent edge — the card's identity colour, kept thin so the grid stays calm. */}
      <span
        aria-hidden="true"
        className="from-primary to-chart-2 absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-70 transition-opacity group-hover:opacity-100"
      />
      <CardHeader className="gap-1 pt-1">
        <CardTitle className="line-clamp-1 text-sm">{project.title}</CardTitle>
        <CardDescription className="line-clamp-1 text-xs">{project.client}</CardDescription>
        <CardAction>
          <Badge tone="accent" mono className="h-5">
            {project.issueIdPrefix}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5 py-0">
        <p className="text-muted-foreground line-clamp-2 min-h-[2.1em] text-xs leading-relaxed">
          {project.description || 'No description provided.'}
        </p>
        <div className="mt-auto space-y-2">
          <dl className="bg-muted/60 grid grid-cols-4 gap-1.5 rounded-lg px-2.5 py-2">
            {configuration.map((item) => (
              <Metric key={item.label} label={item.label} value={item.value} />
            ))}
          </dl>
          <dl className="bg-muted/60 grid grid-cols-4 gap-1.5 rounded-lg px-2.5 py-2">
            {activity.map((item) => (
              <Metric key={item.label} label={item.label} value={item.value} emphasis={item.emphasis} />
            ))}
          </dl>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-1 py-2">
        <span className="text-muted-foreground text-[0.65rem]">Created {formatDate(project.createdAt)}</span>
        <div className="flex items-center gap-1">
          <Link href={`/projects/${id}/registry`} className={buttonVariants({ variant: 'secondary', size: 'xs' })}>
            <ClipboardList data-icon="inline-start" />
            Registry
          </Link>
          <Link href={`/projects/${id}`} className={buttonVariants({ variant: 'outline', size: 'xs' })}>
            <Eye data-icon="inline-start" />
            View
          </Link>
          <Link
            href={`/projects/${id}/edit`}
            aria-label={`Edit ${project.title}`}
            className={buttonVariants({ variant: 'ghost', size: 'icon-xs' })}
          >
            <Pencil />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

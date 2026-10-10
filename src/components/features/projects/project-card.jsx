import Link from 'next/link';
import { Eye, Pencil, ClipboardList } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Summary card for a single project on the dashboard, with view and edit
 * actions. Shows the project's attribute/package configuration plus real
 * issue activity stats.
 * @param {{ project: object, issueStats: object|null }} props
 */
export function ProjectCard({ project, issueStats }) {
  const id = String(project._id);
  const stats = [
    { label: 'HF', value: project.hfAttributes.length },
    { label: 'Risk', value: project.riskAttributes.length },
    { label: 'Action', value: project.actionAttributes.length },
    { label: 'Packages', value: project.packages.length },
  ];
  const issueActivity = [
    { label: 'Issues', value: issueStats?.total ?? 0 },
    { label: 'Open', value: issueStats?.open ?? 0 },
    { label: 'Closed', value: issueStats?.closed ?? 0 },
    { label: 'Recs', value: issueStats?.recommendations ?? 0 },
  ];

  return (
    <Card className="flex h-full flex-col [--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="line-clamp-1">{project.title}</CardTitle>
        <CardDescription className="line-clamp-1">{project.client}</CardDescription>
        <CardAction>
          <span className="bg-accent text-accent-foreground inline-flex h-6 items-center rounded-md px-2 font-mono text-xs font-semibold">
            {project.issueIdPrefix}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {project.description || 'No description provided.'}
        </p>
        <dl className="mt-auto space-y-3 border-t pt-3">
          <div className="grid grid-cols-4 gap-2">
            {stats.map(({ label, value }) => (
              <div key={label} className="space-y-0.5">
                <dt className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-wide">
                  {label}
                </dt>
                <dd className="text-sm font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {issueActivity.map(({ label, value }) => (
              <div key={label} className="space-y-0.5">
                <dt className="text-muted-foreground text-[0.7rem] font-medium uppercase tracking-wide">
                  {label}
                </dt>
                <dd className="text-sm font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </div>
        </dl>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-muted-foreground text-xs">
          Created {formatDate(project.createdAt)}
        </span>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/projects/${id}/registry`}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            <ClipboardList data-icon="inline-start" />
            Registry
          </Link>
          <Link
            href={`/projects/${id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Eye data-icon="inline-start" />
            View
          </Link>
          <Link
            href={`/projects/${id}/edit`}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

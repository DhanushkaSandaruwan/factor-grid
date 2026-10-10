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
    <Card
      size="sm"
      className="flex h-full flex-col gap-2 [--card-spacing:--spacing(2.5)]"
    >
      <CardHeader className="gap-0.5">
        <CardTitle className="line-clamp-1 text-sm">{project.title}</CardTitle>
        <CardDescription className="line-clamp-1 text-xs">{project.client}</CardDescription>
        <CardAction>
          <span className="bg-accent text-accent-foreground inline-flex h-5 items-center rounded px-1.5 font-mono text-[0.65rem] font-semibold">
            {project.issueIdPrefix}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1.5 py-0">
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {project.description || 'No description provided.'}
        </p>
        <dl className="mt-auto space-y-1.5 border-t pt-1.5">
          <div className="grid grid-cols-4 gap-1.5">
            {stats.map(({ label, value }) => (
              <div key={label} className="space-y-0">
                <dt className="text-muted-foreground text-[0.6rem] font-medium uppercase tracking-wide">
                  {label}
                </dt>
                <dd className="text-xs font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {issueActivity.map(({ label, value }) => (
              <div key={label} className="space-y-0">
                <dt className="text-muted-foreground text-[0.6rem] font-medium uppercase tracking-wide">
                  {label}
                </dt>
                <dd className="text-xs font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </div>
        </dl>
      </CardContent>
      <CardFooter className="justify-between gap-1 py-1.5">
        <span className="text-muted-foreground text-[0.65rem]">
          Created {formatDate(project.createdAt)}
        </span>
        <div className="flex items-center gap-1">
          <Link
            href={`/projects/${id}/registry`}
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'h-6 px-1.5 text-[0.65rem]' })}
          >
            <ClipboardList data-icon="inline-start" className="size-2.5" />
            Registry
          </Link>
          <Link
            href={`/projects/${id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-6 px-1.5 text-[0.65rem]' })}
          >
            <Eye data-icon="inline-start" className="size-2.5" />
            View
          </Link>
          <Link
            href={`/projects/${id}/edit`}
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'h-6 px-1.5 text-[0.65rem]' })}
          >
            <Pencil data-icon="inline-start" className="size-2.5" />
            Edit
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

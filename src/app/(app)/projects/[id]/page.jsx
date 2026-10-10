import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, ClipboardList } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { getProjectById } from '@/lib/services/project-service';
import { getProjectAnalytics } from '@/lib/services/project-analytics-service';
import { getProjectTeam, hasActiveMembership } from '@/lib/services/membership-service';
import { buttonVariants } from '@/components/ui/button';
import { BackButton } from '@/components/features/projects/back-button';
import { ProjectMetrics } from '@/components/features/projects/project-metrics';
import { ProjectCharts } from '@/components/features/projects/project-charts';
import { ProjectTrendCard } from '@/components/features/projects/project-trend-card';
import { ProjectTeam } from '@/components/features/projects/project-team';

export async function generateMetadata({ params }) {
  const { userId } = await auth();
  const project = await getProjectById(userId, (await params).id);
  return { title: project ? project.title : 'Project' };
}

/** Project view page — analytics charts, metrics and team management. */
export default async function ProjectPage({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  const project = await getProjectById(userId, id);
  if (!project) notFound();

  const isOwner = String(project.createdBy) === userId;
  const [analytics, team, isEditor] = await Promise.all([
    getProjectAnalytics(project),
    getProjectTeam(project),
    isOwner ? Promise.resolve(true) : hasActiveMembership(userId, id, ['editor']),
  ]);
  const canEdit = isOwner || isEditor;

  return (
    // On xl+ screens the page fits the viewport: the three columns scroll
    // internally instead of the page. On smaller screens the page scrolls
    // normally and the columns stack.
    <div className="scrollbar-refined h-full overflow-y-auto xl:overflow-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col gap-4 p-4 sm:p-6 xl:h-full xl:min-h-0">
        <header className="flex flex-wrap items-center gap-3">
          <BackButton fallbackHref="/dashboard" />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{project.title}</h1>
              <span className="bg-accent text-accent-foreground inline-flex h-6 shrink-0 items-center rounded-md px-2 font-mono text-xs font-semibold">
                {project.issueIdPrefix}
              </span>
            </div>
            <p className="text-muted-foreground truncate text-sm">{project.client}</p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${String(project._id)}/registry`}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                <ClipboardList data-icon="inline-start" />
                Issue Registry
              </Link>
              <Link
                href={`/projects/${String(project._id)}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Pencil data-icon="inline-start" />
                Edit project
              </Link>
            </div>
          )}
        </header>

        <div className="grid flex-1 gap-4 xl:min-h-0 xl:grid-cols-3">
          <section className="scrollbar-refined flex flex-col gap-4 xl:min-h-0 xl:overflow-y-auto">
            <ProjectMetrics analytics={analytics} />
          </section>
          <section className="scrollbar-refined flex flex-col gap-4 xl:min-h-0 xl:overflow-y-auto">
            <ProjectCharts analytics={analytics} />
          </section>
          <section className="scrollbar-refined flex flex-col gap-4 xl:min-h-0 xl:overflow-y-auto">
            <ProjectTrendCard analytics={analytics} />
            <ProjectTeam projectId={String(project._id)} team={team} canManage={canEdit} />
          </section>
        </div>
      </div>
    </div>
  );
}

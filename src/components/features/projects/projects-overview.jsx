import Link from 'next/link';
import { FolderPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyProjects } from './empty-projects';
import { ProjectCard } from './project-card';

/**
 * Dashboard projects column — the right (2/3-width) column. Lists the
 * user's projects as a 2-column grid with a quick create action.
 * @param {{ projects: object[], issueStats: Record<string, object> }} props
 */
export function ProjectsOverview({ projects, issueStats }) {
  if (projects.length === 0) {
    return <EmptyProjects />;
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {projects.length === 1 ? '1 project' : `${projects.length} projects`} · newest first
          </p>
        </div>
        <Link href="/projects/new" className={buttonVariants({ size: 'sm' })}>
          <FolderPlus data-icon="inline-start" />
          New Project
        </Link>
      </header>
      <div className="grid flex-1 items-start gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard
            key={String(project._id)}
            project={project}
            issueStats={issueStats[String(project._id)]}
          />
        ))}
      </div>
    </div>
  );
}

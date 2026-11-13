import Link from 'next/link';
import { FolderPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyProjects } from './empty-projects';
import { ProjectCard } from './project-card';

/**
 * Dashboard projects column — lists the user's projects as a responsive grid
 * with a quick create action.
 * @param {{ projects: object[], issueStats: Record<string, object> }} props
 */
export function ProjectsOverview({ projects, issueStats }) {
  if (projects.length === 0) {
    return <EmptyProjects />;
  }

  return (
    <div className="flex flex-col gap-5 p-1 sm:p-2">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="eyebrow">Portfolio</p>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {projects.length === 1 ? '1 project' : `${projects.length} projects`} · newest first
          </p>
        </div>
        <Link href="/projects/new" className={buttonVariants({ size: 'sm', className: 'shadow-soft' })}>
          <FolderPlus data-icon="inline-start" />
          New Project
        </Link>
      </header>
      <div className="grid items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-3">
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

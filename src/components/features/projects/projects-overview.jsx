import Link from 'next/link';
import { FolderPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyProjects } from './empty-projects';
import { ProjectCard } from './project-card';

/**
 * Dashboard projects section — a responsive grid of the user's projects,
 * newest first, with a quick create action. Shows an inviting empty state
 * when there are no projects yet.
 * @param {{ projects: object[], issueStats: Record<string, object> }} props
 */
export function ProjectsOverview({ projects, issueStats }) {
  if (projects.length === 0) {
    return <EmptyProjects />;
  }

  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={String(project._id)}
              project={project}
              issueStats={issueStats[String(project._id)]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

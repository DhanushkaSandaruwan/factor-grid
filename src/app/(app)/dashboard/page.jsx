import { auth } from '@clerk/nextjs/server';
import { getProjectsForUser } from '@/lib/services/project-service';
import { getIssueStatsByProject } from '@/lib/services/issue-service';
import { getDashboardStats } from '@/lib/services/dashboard-service';
import { DashboardOverview } from '@/components/features/projects/dashboard-overview';
import { ProjectsOverview } from '@/components/features/projects/projects-overview';

export const metadata = {
  title: 'Dashboard',
};

/**
 * Dashboard — portfolio overview beside the project list. Desktop keeps the
 * two-column split (overview on the left, projects on the right) and fits the
 * viewport; narrower screens stack the columns and scroll normally.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  const projects = await getProjectsForUser(userId);
  // Both aggregations only depend on the project list, so run them together.
  const [issueStats, dashboardStats] = await Promise.all([
    getIssueStatsByProject(projects.map((p) => String(p._id))),
    getDashboardStats(userId, projects),
  ]);

  return (
    <div className="scrollbar-refined flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:flex-row lg:overflow-hidden">
      <aside className="scrollbar-refined min-w-0 lg:w-[22rem] lg:shrink-0 lg:overflow-y-auto xl:w-96">
        <DashboardOverview stats={dashboardStats} />
      </aside>
      <section className="scrollbar-refined min-h-0 min-w-0 flex-1 lg:overflow-y-auto">
        <ProjectsOverview projects={projects} issueStats={issueStats} />
      </section>
    </div>
  );
}

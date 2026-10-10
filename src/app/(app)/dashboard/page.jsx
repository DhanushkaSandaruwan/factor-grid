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
 * Dashboard — full-width two-column layout. Left column (1/3) shows
 * aggregated portfolio stats and charts. Right column (2/3) shows the
 * user's project cards. The page fits the viewport without scrolling.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  const projects = await getProjectsForUser(userId);
  const issueStats = await getIssueStatsByProject(projects.map((p) => String(p._id)));
  const dashboardStats = await getDashboardStats(userId, projects);

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 sm:p-6">
      <aside className="scrollbar-refined w-1/3 min-w-0 overflow-y-auto">
        <DashboardOverview stats={dashboardStats} />
      </aside>
      <section className="scrollbar-refined w-2/3 min-w-0 overflow-y-auto">
        <ProjectsOverview projects={projects} issueStats={issueStats} />
      </section>
    </div>
  );
}

import { auth } from '@clerk/nextjs/server';
import { getProjectsForUser } from '@/lib/services/project-service';
import { getIssueStatsByProject } from '@/lib/services/issue-service';
import { ProjectsOverview } from '@/components/features/projects/projects-overview';

export const metadata = {
  title: 'Dashboard',
};

/** Dashboard — lists the projects the signed-in user owns or is a member of. */
export default async function DashboardPage() {
  const { userId } = await auth();
  const projects = await getProjectsForUser(userId);
  const issueStats = await getIssueStatsByProject(projects.map((p) => String(p._id)));
  return <ProjectsOverview projects={projects} issueStats={issueStats} />;
}

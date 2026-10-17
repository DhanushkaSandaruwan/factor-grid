import { searchProjectsAndIssues } from '@/lib/services/search-service';

/**
 * Search tool — wraps the existing search service so the AI can find
 * projects and issues the user can access.
 */
export const searchTool = {
  name: 'search_projects_issues',
  description:
    'Search across the user’s projects and issues by keyword. Returns matching ' +
    'projects and issues with their titles and page paths.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search term, e.g. "usability" or "HF-001".' },
    },
    required: ['query'],
  },
  /**
   * @param {{query: string}} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const results = await searchProjectsAndIssues(ctx.userId, String(args?.query ?? ''));
    return {
      ok: true,
      projects: results.projects,
      issues: results.issues,
    };
  },
};

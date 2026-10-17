import {
  getIssuesByProject,
  getIssueById,
  createIssue,
  updateIssue,
  updateIssueType,
} from '@/lib/services/issue-service';
import { getProjectById } from '@/lib/services/project-service';
import { hasActiveMembership } from '@/lib/services/membership-service';

/**
 * Issue tools — full CRUD over issues within the user’s projects.
 */

export const listIssuesTool = {
  name: 'list_issues',
  description: 'List all issues in a project, newest first.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
    },
    required: ['projectId'],
  },
  /**
   * @param {{projectId: string}} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };
    const issues = await getIssuesByProject(String(args.projectId));
    return {
      ok: true,
      issues: issues.map((i) => ({
        id: i._id,
        issueId: i.issueId,
        title: i.title,
        status: i.status,
        issueType: i.issueType,
      })),
    };
  },
};

export const getIssueTool = {
  name: 'get_issue',
  description: 'Get full details of a specific issue including recommendations and requirements.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      issueId: { type: 'string', description: 'The 24-character issue ID.' },
    },
    required: ['projectId', 'issueId'],
  },
  /**
   * @param {{projectId: string, issueId: string}} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };
    const issue = await getIssueById(String(args.issueId), String(args.projectId));
    if (!issue) return { ok: false, error: 'Issue not found.' };
    return { ok: true, issue };
  },
};

export const createIssueTool = {
  name: 'create_issue',
  description:
    'Create a new issue in a project. The issue ID is auto-generated from the ' +
    'project prefix. Requires title; description, consequences, and source are optional.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      title: { type: 'string', description: 'Issue title (3-200 chars).' },
      description: { type: 'string', description: 'Optional detailed description.' },
      consequences: { type: 'string', description: 'Optional consequences.' },
      source: { type: 'string', description: 'Optional source of the issue.' },
      issueType: { type: 'string', enum: ['usability', 'safety', 'both'], description: 'Optional issue type.' },
    },
    required: ['projectId', 'title'],
  },
  /**
   * @param {Record<string, unknown>} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };

    const result = await createIssue(ctx.userId, String(args.projectId), project.issueIdPrefix, {
      title: args.title,
      description: args.description ?? '',
      consequences: args.consequences ?? '',
      source: args.source ?? '',
      packageIds: [],
    });
    if (!result.ok) return { ok: false, errors: result.errors };

    if (args.issueType) {
      await updateIssueType(String(result.issue._id), String(args.projectId), {
        issueType: args.issueType,
      });
    }

    return {
      ok: true,
      issue: { ...result.issue, _id: String(result.issue._id) },
    };
  },
};

export const updateIssueTool = {
  name: 'update_issue',
  description: 'Update an existing issue’s title, description, consequences, or type.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      issueId: { type: 'string', description: 'The 24-character issue ID.' },
      title: { type: 'string' },
      description: { type: 'string' },
      consequences: { type: 'string' },
      issueType: { type: 'string', enum: ['usability', 'safety', 'both'] },
    },
    required: ['projectId', 'issueId'],
  },
  /**
   * @param {Record<string, unknown>} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };

    const canEdit =
      project.createdBy === ctx.userId ||
      (await hasActiveMembership(ctx.userId, String(args.projectId), ['editor']));
    if (!canEdit) return { ok: false, error: 'You do not have edit access to this project.' };

    const result = await updateIssue(String(args.issueId), String(args.projectId), {
      title: args.title,
      description: args.description ?? '',
      consequences: args.consequences ?? '',
      source: '',
      packageIds: [],
    });
    if (!result) return { ok: false, error: 'Issue not found.' };
    if (!result.ok) return { ok: false, errors: result.errors };

    if (args.issueType) {
      await updateIssueType(String(args.issueId), String(args.projectId), {
        issueType: args.issueType,
      });
    }

    return {
      ok: true,
      issue: { ...result.issue, _id: String(result.issue._id) },
    };
  },
};

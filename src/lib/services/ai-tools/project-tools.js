import {
  getProjectsForUser,
  getProjectById,
  createProject,
  updateProject,
} from '@/lib/services/project-service';
import { getAttributeOptions } from '@/lib/services/attribute-option-service';
import { getPackages } from '@/lib/services/package-service';

/**
 * Project tools — full CRUD over the user’s projects. Handlers call the
 * same service functions the UI uses, so access control is identical.
 */

export const listProjectsTool = {
  name: 'list_projects',
  description: 'List all projects the user can access, newest first.',
  parameters: { type: 'object', properties: {} },
  /**
   * @param {object} _args
   * @param {{userId: string}} ctx
   */
  async handler(_args, ctx) {
    const projects = await getProjectsForUser(ctx.userId);
    return {
      ok: true,
      projects: projects.map((p) => ({
        id: p._id,
        title: p.title,
        client: p.client,
        issueIdPrefix: p.issueIdPrefix,
        status: p.status,
        path: `/projects/${p._id}`,
      })),
    };
  },
};

export const getProjectTool = {
  name: 'get_project',
  description: 'Get full details of a specific project by its ID.',
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
    const project = await getProjectById(ctx.userId, String(args?.projectId ?? ''));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };
    return { ok: true, project };
  },
};

export const createProjectTool = {
  name: 'create_project',
  description:
    'Create a new human-factors analysis project. Requires title, client, and ' +
    'issueIdPrefix. Attribute selections are optional.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Project title (3-150 chars).' },
      client: { type: 'string', description: 'Client name.' },
      issueIdPrefix: {
        type: 'string',
        description: 'Short unique prefix for issue IDs, e.g. "HF" (2-12 chars).',
      },
      description: { type: 'string', description: 'Optional project description.' },
      hfAttributes: { type: 'array', items: { type: 'string' }, description: 'Optional HF attribute names.' },
      riskAttributes: { type: 'array', items: { type: 'string' }, description: 'Optional risk attribute names.' },
      actionAttributes: { type: 'array', items: { type: 'string' }, description: 'Optional action attribute names.' },
    },
    required: ['title', 'client', 'issueIdPrefix'],
  },
  /**
   * @param {Record<string, unknown>} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const result = await createProject(ctx.userId, {
      title: args.title,
      client: args.client,
      issueIdPrefix: args.issueIdPrefix,
      description: args.description ?? '',
      hfAttributes: args.hfAttributes ?? [],
      riskAttributes: args.riskAttributes ?? [],
      actionAttributes: args.actionAttributes ?? [],
      packageIds: [],
    });
    if (!result.ok) {
      return { ok: false, errors: result.errors };
    }
    return {
      ok: true,
      project: { ...result.project, _id: String(result.project._id) },
    };
  },
};

export const updateProjectTool = {
  name: 'update_project',
  description: 'Update an existing project the user owns or can edit.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      title: { type: 'string' },
      client: { type: 'string' },
      issueIdPrefix: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['projectId'],
  },
  /**
   * @param {Record<string, unknown>} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };

    const result = await updateProject(ctx.userId, String(args.projectId), {
      title: args.title ?? project.title,
      client: args.client ?? project.client,
      issueIdPrefix: args.issueIdPrefix ?? project.issueIdPrefix,
      description: args.description ?? project.description ?? '',
      hfAttributes: project.hfAttributes ?? [],
      riskAttributes: project.riskAttributes ?? [],
      actionAttributes: project.actionAttributes ?? [],
      packageIds: (project.packages ?? []).map((p) => p._id),
    });
    if (!result.ok) {
      if (result.code) return { ok: false, error: result.code };
      return { ok: false, errors: result.errors };
    }
    return {
      ok: true,
      project: { ...result.project, _id: String(result.project._id) },
    };
  },
};

export const getAttributeOptionsTool = {
  name: 'get_attribute_options',
  description:
    'List available attribute options for project creation/editing. Returns ' +
    'categories: hf, risk, action, action_type.',
  parameters: { type: 'object', properties: {} },
  async handler() {
    const options = await getAttributeOptions();
    return { ok: true, options };
  },
};

export const getPackagesTool = {
  name: 'get_packages',
  description: 'List all available analysis packages.',
  parameters: { type: 'object', properties: {} },
  async handler() {
    const packages = await getPackages();
    return {
      ok: true,
      packages: packages.map((p) => ({ id: String(p._id), packageId: p.packageId, description: p.description })),
    };
  },
};

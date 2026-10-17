import {
  getLinksByProject,
  createLink,
  updateLink,
  deleteLink,
} from '@/lib/services/link-service';
import { getProjectById } from '@/lib/services/project-service';
import { hasActiveMembership } from '@/lib/services/membership-service';

/**
 * Link tools — full CRUD over HFDR / PSID traceability links.
 */

export const listLinksTool = {
  name: 'list_links',
  description: 'List all HFDR and PSID links in a project.',
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
    const links = await getLinksByProject(String(args.projectId));
    return {
      ok: true,
      links: links.map((l) => ({
        id: l._id,
        type: l.type,
        code: l.code,
        description: l.description,
        lead: l.lead,
      })),
    };
  },
};

export const createLinkTool = {
  name: 'create_link',
  description:
    'Create a new HFDR or PSID traceability link in a project. Requires type ' +
    '("hfdr" or "psid") and code (the identifier).',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      type: { type: 'string', enum: ['hfdr', 'psid'], description: 'Link group.' },
      code: { type: 'string', description: 'The identifier, e.g. "HFDR-001".' },
      description: { type: 'string', description: 'Optional description.' },
      lead: { type: 'string', description: 'Optional responsible person.' },
      issueIds: { type: 'array', items: { type: 'string' }, description: 'Optional issue IDs referenced.' },
    },
    required: ['projectId', 'type', 'code'],
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

    const result = await createLink(String(args.projectId), ctx.userId, {
      type: args.type,
      code: args.code,
      description: args.description ?? '',
      lead: args.lead ?? '',
      issueIds: args.issueIds ?? [],
      packages: [],
    });
    if (!result) return { ok: false, error: 'Invalid project.' };
    if (!result.ok) return { ok: false, errors: result.errors };

    return {
      ok: true,
      link: { ...result.link, _id: String(result.link._id) },
    };
  },
};

export const updateLinkTool = {
  name: 'update_link',
  description: 'Update an existing link’s code, description, lead, or referenced issues.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      linkId: { type: 'string', description: 'The 24-character link ID.' },
      type: { type: 'string', enum: ['hfdr', 'psid'] },
      code: { type: 'string' },
      description: { type: 'string' },
      lead: { type: 'string' },
      issueIds: { type: 'array', items: { type: 'string' } },
    },
    required: ['projectId', 'linkId'],
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

    const result = await updateLink(String(args.linkId), String(args.projectId), {
      type: args.type ?? 'hfdr',
      code: args.code ?? '',
      description: args.description ?? '',
      lead: args.lead ?? '',
      issueIds: args.issueIds ?? [],
      packages: [],
    });
    if (!result) return { ok: false, error: 'Link not found.' };
    if (!result.ok) return { ok: false, errors: result.errors };

    return {
      ok: true,
      link: { ...result.link, _id: String(result.link._id) },
    };
  },
};

export const deleteLinkTool = {
  name: 'delete_link',
  description: 'Delete a link from a project. This also removes it from any requirements that reference it.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'The 24-character project ID.' },
      linkId: { type: 'string', description: 'The 24-character link ID.' },
    },
    required: ['projectId', 'linkId'],
  },
  /**
   * @param {{projectId: string, linkId: string}} args
   * @param {{userId: string}} ctx
   */
  async handler(args, ctx) {
    const project = await getProjectById(ctx.userId, String(args.projectId));
    if (!project) return { ok: false, error: 'Project not found or not accessible.' };

    const canEdit =
      project.createdBy === ctx.userId ||
      (await hasActiveMembership(ctx.userId, String(args.projectId), ['editor']));
    if (!canEdit) return { ok: false, error: 'You do not have edit access to this project.' };

    const deleted = await deleteLink(String(args.linkId), String(args.projectId));
    if (!deleted) return { ok: false, error: 'Link not found.' };
    return { ok: true, deleted: true };
  },
};

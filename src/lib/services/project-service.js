import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/models/project';
import { ProjectMembership } from '@/models/project-membership';
import { validateAttributeSelections } from './attribute-option-service';
import { getPackagesByIds } from './package-service';
import { collectFieldErrors } from './validation-utils';

export const projectBasicsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Project title must be at least 3 characters')
    .max(150, 'Project title must be 150 characters or fewer'),
  client: z.string().trim().min(1, 'Client is required').max(150, 'Client must be 150 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional()
    .default(''),
  issueIdPrefix: z
    .string()
    .trim()
    .min(2, 'Issue ID prefix must be at least 2 characters')
    .max(12, 'Issue ID prefix must be 12 characters or fewer')
    .regex(/^[A-Za-z0-9-]+$/, 'Prefix may only contain letters, numbers and hyphens'),
});

/**
 * Validate the full wizard payload against the database. Shared by the
 * create and update flows. Returns the failing wizard step alongside
 * field errors so the client can jump back to the right place.
 * @param {unknown} payload
 * @returns {Promise<{step: number, errors: Record<string, string>} | {data: object, selections: {hf: string[], risk: string[], action: string[]}, packages: object[]}>}
 */
async function validateProjectPayload(payload) {
  const parsed = projectBasicsSchema.safeParse(payload);
  if (!parsed.success) {
    return { step: 1, errors: collectFieldErrors(parsed.error) };
  }

  const selections = {
    hf: payload.hfAttributes ?? [],
    risk: payload.riskAttributes ?? [],
    action: payload.actionAttributes ?? [],
  };
  const attributeErrors = await validateAttributeSelections(selections);
  if (Object.keys(attributeErrors).length > 0) {
    return { step: 2, errors: attributeErrors };
  }

  const packageIds = payload.packageIds ?? [];
  const packages = await getPackagesByIds(packageIds);
  if (packages.length !== new Set(packageIds).size) {
    return {
      step: 3,
      errors: { packages: 'One or more selected packages are no longer available.' },
    };
  }

  return { data: parsed.data, selections, packages };
}

/**
 * Map a lean project document (with populated packages) to a plain object
 * with string ids, safe to pass from server to client components.
 * @param {object} project
 * @returns {object}
 */
function toSerializableProject(project) {
  return {
    ...project,
    _id: String(project._id),
    packages: (project.packages ?? []).map((pkg) => ({ ...pkg, _id: String(pkg._id) })),
  };
}

/**
 * List projects the user can see — projects they created plus projects
 * where they are an active team member — newest first, with packages
 * populated.
 * @param {string} clerkUserId
 * @returns {Promise<object[]>}
 */
export async function getProjectsForUser(clerkUserId) {
  await connectToDatabase();
  const memberProjectIds = await ProjectMembership.find({
    user: clerkUserId,
    status: 'active',
  }).distinct('project');
  const projects = await Project.find({
    $or: [{ createdBy: clerkUserId }, { _id: { $in: memberProjectIds } }],
  })
    .sort({ createdAt: -1 })
    .populate('packages', 'packageId description')
    .lean();
  return projects.map(toSerializableProject);
}

/**
 * Fetch a single project the user may access (as owner or active team
 * member), or null.
 * @param {string} clerkUserId
 * @param {string} projectId
 * @returns {Promise<object|null>}
 */
export async function getProjectById(clerkUserId, projectId) {
  if (!mongoose.isValidObjectId(projectId)) return null;
  await connectToDatabase();
  const project = await Project.findById(projectId)
    .populate('packages', 'packageId description')
    .lean();
  if (!project) return null;

  if (project.createdBy !== clerkUserId) {
    const member = await ProjectMembership.exists({
      project: project._id,
      user: clerkUserId,
      status: 'active',
    });
    if (!member) return null;
  }
  return toSerializableProject(project);
}

/**
 * Validate the wizard payload and create the project.
 * @param {string} clerkUserId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, project: object} | {ok: false, step: number, errors: Record<string, string>}>}
 */
export async function createProject(clerkUserId, payload) {
  const validated = await validateProjectPayload(payload);
  if (validated.errors) {
    return { ok: false, step: validated.step, errors: validated.errors };
  }

  const { data, selections, packages } = validated;
  await connectToDatabase();

  const issueIdPrefix = data.issueIdPrefix.toUpperCase();
  const existing = await Project.findOne({ issueIdPrefix }).lean();
  if (existing) {
    return {
      ok: false,
      step: 1,
      errors: { issueIdPrefix: 'This issue ID prefix is already used by another project.' },
    };
  }

  const project = await Project.create({
    ...data,
    issueIdPrefix,
    hfAttributes: selections.hf,
    riskAttributes: selections.risk,
    actionAttributes: selections.action,
    packages: packages.map((pkg) => pkg._id),
    createdBy: clerkUserId,
  });

  return { ok: true, project: project.toObject() };
}

/**
 * Validate the wizard payload and update a project the user may edit
 * (owner or active editor member).
 * @param {string} clerkUserId
 * @param {string} projectId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, project: object} | {ok: false, code: string} | {ok: false, step: number, errors: Record<string, string>}>}
 */
export async function updateProject(clerkUserId, projectId, payload) {
  if (!mongoose.isValidObjectId(projectId)) {
    return { ok: false, code: 'not_found' };
  }

  await connectToDatabase();
  const project = await Project.findById(projectId).lean();
  if (!project) {
    return { ok: false, code: 'not_found' };
  }

  const canEdit =
    project.createdBy === clerkUserId ||
    (await ProjectMembership.exists({
      project: project._id,
      user: clerkUserId,
      status: 'active',
      role: 'editor',
    }));
  if (!canEdit) {
    return { ok: false, code: 'forbidden' };
  }

  const validated = await validateProjectPayload(payload);
  if (validated.errors) {
    return { ok: false, step: validated.step, errors: validated.errors };
  }

  const { data, selections, packages } = validated;
  const issueIdPrefix = data.issueIdPrefix.toUpperCase();
  const clash = await Project.findOne({ issueIdPrefix, _id: { $ne: project._id } }).lean();
  if (clash) {
    return {
      ok: false,
      step: 1,
      errors: { issueIdPrefix: 'This issue ID prefix is already used by another project.' },
    };
  }

  const updated = await Project.findByIdAndUpdate(
    project._id,
    {
      $set: {
        ...data,
        issueIdPrefix,
        hfAttributes: selections.hf,
        riskAttributes: selections.risk,
        actionAttributes: selections.action,
        packages: packages.map((pkg) => pkg._id),
      },
    },
    { new: true }
  )
    .populate('packages', 'packageId description')
    .lean();

  return { ok: true, project: updated };
}

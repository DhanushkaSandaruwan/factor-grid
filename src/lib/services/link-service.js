import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Link } from '@/models/link';
import { Issue } from '@/models/issue';
import { collectFieldErrors } from './validation-utils';

/**
 * Link service — CRUD for project-scoped HFDR / PSID traceability links.
 *
 * Deleting a link also pulls its id from every requirement that references
 * it so issues never keep stale references.
 */

const linkPayloadSchema = z.object({
  type: z.enum(['hfdr', 'psid'], { errorMap: () => ({ message: 'Link type must be HFDR or PSID.' }) }),
  code: z.string().trim().min(1, 'ID is required').max(100, 'ID must be 100 characters or fewer'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer').default(''),
  packages: z.array(z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid package reference.')).default([]),
  issueIds: z
    .array(z.string().trim().min(1).max(100, 'Issue IDs must be 100 characters or fewer'))
    .max(50, 'Too many issue IDs.')
    .default([]),
  lead: z.string().trim().max(100, 'Lead must be 100 characters or fewer').default(''),
  doorsId: z.string().trim().max(100, 'Doors ID must be 100 characters or fewer').default(''),
});

/** @typedef {z.infer<typeof linkPayloadSchema>} LinkPayload */

/** Map a link document (packages populated) to a client-safe object. */
function toSerializable(link) {
  return {
    ...link,
    _id: String(link._id),
    project: String(link.project),
    packages: (link.packages ?? []).map((pkg) =>
      typeof pkg === 'object' ? { _id: String(pkg._id), packageId: pkg.packageId } : String(pkg)
    ),
  };
}

/**
 * List all links for a project, newest first, with packages populated.
 * @param {string} projectId
 * @returns {Promise<object[]>}
 */
export async function getLinksByProject(projectId) {
  if (!mongoose.isValidObjectId(projectId)) return [];
  await connectToDatabase();

  const links = await Link.find({ project: new mongoose.Types.ObjectId(projectId) })
    .sort({ createdAt: -1 })
    .populate('packages', 'packageId')
    .lean();
  return links.map(toSerializable);
}

/**
 * Create a link for a project.
 * @param {string} projectId
 * @param {string} clerkUserId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, link: object} | {ok: false, errors: Record<string,string>} | null>} null on invalid project id
 */
export async function createLink(projectId, clerkUserId, payload) {
  if (!mongoose.isValidObjectId(projectId)) return null;

  const parsed = linkPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: collectFieldErrors(parsed.error) };

  await connectToDatabase();
  try {
    const link = await Link.create({
      ...parsed.data,
      packages: parsed.data.packages.map((id) => new mongoose.Types.ObjectId(id)),
      project: new mongoose.Types.ObjectId(projectId),
      createdBy: clerkUserId,
    });
    return { ok: true, link: toSerializable(link.toObject()) };
  } catch (error) {
    if (error?.code === 11000) {
      return { ok: false, errors: { code: 'This ID already exists for the selected type.' } };
    }
    throw error;
  }
}

/**
 * Update an existing link scoped to a project.
 * @param {string} linkId
 * @param {string} projectId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, link: object} | {ok: false, errors: Record<string,string>} | null>} null when link or project not found
 */
export async function updateLink(linkId, projectId, payload) {
  if (!mongoose.isValidObjectId(linkId) || !mongoose.isValidObjectId(projectId)) return null;

  const parsed = linkPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, errors: collectFieldErrors(parsed.error) };

  await connectToDatabase();
  try {
    const link = await Link.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(linkId),
        project: new mongoose.Types.ObjectId(projectId),
      },
      {
        $set: {
          ...parsed.data,
          packages: parsed.data.packages.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
      { new: true }
    ).populate('packages', 'packageId');

    if (!link) return null;
    return { ok: true, link: toSerializable(link.toObject()) };
  } catch (error) {
    if (error?.code === 11000) {
      return { ok: false, errors: { code: 'This ID already exists for the selected type.' } };
    }
    throw error;
  }
}

/**
 * Delete a link and remove its id from every requirement referencing it.
 * @param {string} linkId
 * @param {string} projectId
 * @returns {Promise<boolean>} whether the link existed and was deleted
 */
export async function deleteLink(linkId, projectId) {
  if (!mongoose.isValidObjectId(linkId) || !mongoose.isValidObjectId(projectId)) return false;

  await connectToDatabase();
  const linkObjectId = new mongoose.Types.ObjectId(linkId);
  const projectObjectId = new mongoose.Types.ObjectId(projectId);

  const result = await Link.findOneAndDelete({
    _id: linkObjectId,
    project: projectObjectId,
  });
  if (!result) return false;

  // Pull the deleted link from all requirements across the project's issues.
  await Issue.updateMany(
    { project: projectObjectId },
    { $pull: { 'recommendations.$[].requirements.$[].linkIds': linkObjectId } }
  );
  return true;
}

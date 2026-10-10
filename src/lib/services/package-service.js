import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { Package } from '@/models/package';
import { collectFieldErrors } from './validation-utils';

export const packageSchema = z.object({
  packageId: z
    .string()
    .trim()
    .min(2, 'Package ID must be at least 2 characters')
    .max(50, 'Package ID must be 50 characters or fewer')
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9 _-]*$/,
      'Package ID may only contain letters, numbers, spaces, underscores and hyphens'
    ),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be 1000 characters or fewer')
    .optional()
    .default(''),
});

/**
 * List all packages, ordered by ID. Ids are serialized to strings so the
 * result can cross the server→client component boundary.
 * @returns {Promise<object[]>}
 */
export async function getPackages() {
  await connectToDatabase();
  const packages = await Package.find().sort({ packageId: 1 }).lean();
  return packages.map((pkg) => ({ ...pkg, _id: String(pkg._id) }));
}

/**
 * Validate and create a package. IDs are normalized to uppercase and
 * must be unique (case-insensitive).
 * @param {string} clerkUserId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, package: object} | {ok: false, errors: Record<string, string>}>}
 */
export async function createPackage(clerkUserId, payload) {
  const parsed = packageSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: collectFieldErrors(parsed.error) };
  }

  const packageId = parsed.data.packageId.toUpperCase();
  await connectToDatabase();

  const existing = await Package.findOne({ packageId }).lean();
  if (existing) {
    return { ok: false, errors: { packageId: 'A package with this ID already exists.' } };
  }

  const created = await Package.create({ ...parsed.data, packageId, createdBy: clerkUserId });
  return { ok: true, package: created.toObject() };
}

/**
 * Resolve a list of package ids to documents, ignoring malformed ids.
 * @param {string[]} ids
 * @returns {Promise<object[]>}
 */
export async function getPackagesByIds(ids) {
  const uniqueIds = [...new Set(ids)];
  const objectIds = uniqueIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return [];

  await connectToDatabase();
  const packages = await Package.find({ _id: { $in: objectIds } }).lean();
  return packages.map((pkg) => ({ ...pkg, _id: String(pkg._id) }));
}

/**
 * Fetch all packages linked to a project. The project document already holds
 * the package ObjectIds — this resolves them to full package documents.
 * @param {object} project - project document (or serialised version) with a packages array
 * @returns {Promise<object[]>}
 */
export async function getPackagesForProject(project) {
  const ids = (project.packages ?? []).map((p) => (typeof p === 'object' ? String(p._id) : String(p)));
  if (ids.length === 0) return [];
  return getPackagesByIds(ids);
}

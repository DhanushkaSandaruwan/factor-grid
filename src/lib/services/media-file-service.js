import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { MediaFile } from '@/models/media-file';
import { ProjectMembership } from '@/models/project-membership';
import { getMaxFileSize, isR2Configured } from '@/lib/r2';
import { getProjectById } from './project-service';
import { hasActiveMembership } from './membership-service';
import { collectFieldErrors } from './validation-utils';
import {
  buildObjectKey,
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteObject,
  headObject,
  putObject,
} from './storage-service';

/**
 * Media file service — validation, access control and orchestration on top of
 * the raw R2 operations in `storage-service.js`.
 *
 * Access model:
 *  - `user` scope    — only the uploader may read or delete.
 *  - `project` scope — any active project member may read; the uploader, the
 *    project owner or an active editor may delete.
 */

/** Media and document types accepted by default; override with R2_ALLOWED_CONTENT_TYPES. */
export const DEFAULT_ALLOWED_CONTENT_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/svg+xml',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  // Audio
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  // Documents
  'application/pdf',
  'application/json',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

/**
 * Content types this deployment accepts. `R2_ALLOWED_CONTENT_TYPES` replaces
 * the default list when set to a comma-separated value.
 * @returns {string[]}
 */
export function getAllowedContentTypes() {
  const override = (process.env.R2_ALLOWED_CONTENT_TYPES ?? '').trim();
  if (override) {
    return override
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_CONTENT_TYPES;
}

const createUploadSchema = z.object({
  filename: z.string().trim().min(1, 'File name is required').max(255),
  contentType: z.string().trim().min(1, 'Content type is required').max(255),
  size: z.number().int('Size must be a whole number of bytes').positive('Size must be greater than zero'),
  projectId: z.string().trim().optional(),
  label: z.string().trim().max(100).optional().default(''),
});

/** @typedef {z.infer<typeof createUploadSchema>} CreateUploadInput */

/** Map a lean media file document to a client-safe plain object. */
function toSerializable(file) {
  return {
    ...file,
    _id: String(file._id),
    project: file.project ? String(file.project) : null,
  };
}

/**
 * Whether the user may read a file. Project-scoped files are readable by any
 * active member (the project lookup already enforces owner-or-member).
 * @param {string} clerkUserId
 * @param {object} file - lean media file document
 * @returns {Promise<boolean>}
 */
async function canReadFile(clerkUserId, file) {
  if (file.scope === 'user') {
    return file.uploadedBy === clerkUserId;
  }
  const project = await getProjectById(clerkUserId, String(file.project));
  return Boolean(project);
}

/**
 * Whether the user may delete a file: the uploader, or for project-scoped
 * files the owner or an active editor.
 * @param {string} clerkUserId
 * @param {object} file - lean media file document
 * @returns {Promise<boolean>}
 */
async function canDeleteFile(clerkUserId, file) {
  if (file.uploadedBy === clerkUserId) return true;
  if (file.scope !== 'project') return false;

  const project = await getProjectById(clerkUserId, String(file.project));
  if (!project) return false;
  if (project.createdBy === clerkUserId) return true;
  return hasActiveMembership(clerkUserId, String(file.project), ['editor']);
}

/**
 * Issue an upload ticket: validate the request, reserve the object key and
 * hand back a presigned PUT URL the client uploads to directly.
 * @param {string} clerkUserId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, file: object, upload: {url: string, method: string, headers: Record<string,string>, expiresAt: Date}} |
 *   {ok: false, code: 'not_configured'|'forbidden'|'invalid', errors?: Record<string,string>, message?: string}>}
 */
export async function createUploadTicket(clerkUserId, payload) {
  if (!isR2Configured()) {
    return { ok: false, code: 'not_configured' };
  }

  const parsed = createUploadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, code: 'invalid', errors: collectFieldErrors(parsed.error) };
  }

  const { filename, contentType, size, projectId, label } = parsed.data;

  const maxSize = getMaxFileSize();
  if (size > maxSize) {
    return {
      ok: false,
      code: 'invalid',
      errors: {
        size: `File is too large. The maximum size is ${Math.floor(maxSize / (1024 * 1024))} MB.`,
      },
    };
  }

  const normalizedType = contentType.toLowerCase();
  if (!getAllowedContentTypes().includes(normalizedType)) {
    return {
      ok: false,
      code: 'invalid',
      errors: { contentType: 'This file type is not allowed.' },
    };
  }

  let scope = 'user';
  if (projectId) {
    if (!mongoose.isValidObjectId(projectId)) {
      return { ok: false, code: 'invalid', errors: { projectId: 'Invalid project reference.' } };
    }
    const project = await getProjectById(clerkUserId, projectId);
    if (!project) {
      return { ok: false, code: 'forbidden' };
    }
    scope = 'project';
  }

  await connectToDatabase();

  const fileId = new mongoose.Types.ObjectId();
  const key = buildObjectKey({
    scope,
    ownerId: projectId ?? clerkUserId,
    fileId: String(fileId),
    filename,
  });

  const file = await MediaFile.create({
    _id: fileId,
    key,
    filename,
    contentType: normalizedType,
    size,
    status: 'pending',
    scope,
    project: scope === 'project' ? projectId : null,
    uploadedBy: clerkUserId,
    label,
  });

  const upload = await createPresignedUploadUrl({ key, contentType: normalizedType });

  return {
    ok: true,
    file: toSerializable(file.toObject()),
    upload: {
      url: upload.url,
      method: 'PUT',
      headers: { 'Content-Type': normalizedType },
      expiresAt: upload.expiresAt,
    },
  };
}

/**
 * Confirm a presigned upload landed in R2 and activate the file record.
 * @param {string} clerkUserId
 * @param {string} fileId
 * @returns {Promise<{ok: true, file: object} | {ok: false, code: string}>}
 */
export async function confirmUpload(clerkUserId, fileId) {
  if (!mongoose.isValidObjectId(fileId)) {
    return { ok: false, code: 'not_found' };
  }

  await connectToDatabase();
  const file = await MediaFile.findById(fileId).lean();
  if (!file || file.uploadedBy !== clerkUserId) {
    return { ok: false, code: 'not_found' };
  }

  const head = await headObject(file.key);
  if (!head) {
    await MediaFile.updateOne({ _id: file._id }, { $set: { status: 'failed' } });
    return { ok: false, code: 'not_uploaded' };
  }

  const updated = await MediaFile.findByIdAndUpdate(
    file._id,
    {
      $set: {
        status: 'active',
        size: head.size || file.size,
        contentType: head.contentType || file.contentType,
        etag: head.etag,
      },
    },
    { new: true },
  ).lean();

  return { ok: true, file: toSerializable(updated) };
}

/**
 * Upload a file straight through the API (small files, no presigned round
 * trip). The record is created and activated in one step.
 * @param {string} clerkUserId
 * @param {{filename: string, contentType: string, size: number, body: Buffer, projectId?: string, label?: string}} input
 * @returns {Promise<{ok: true, file: object} | {ok: false, code: string, errors?: Record<string,string>}>}
 */
export async function uploadFileDirectly(clerkUserId, input) {
  const ticket = await createUploadTicket(clerkUserId, {
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
    projectId: input.projectId,
    label: input.label,
  });
  if (!ticket.ok) {
    return ticket;
  }

  try {
    const { etag } = await putObject({
      key: ticket.file.key,
      body: input.body,
      contentType: ticket.file.contentType,
    });

    const updated = await MediaFile.findByIdAndUpdate(
      ticket.file._id,
      { $set: { status: 'active', etag } },
      { new: true },
    ).lean();

    return { ok: true, file: toSerializable(updated) };
  } catch (error) {
    await MediaFile.updateOne({ _id: ticket.file._id }, { $set: { status: 'failed' } });
    throw error;
  }
}

/**
 * Fetch a file the user may read, or null. Only confirmed (`active`) files are
 * returned — a pending ticket has no bytes in R2 yet, so there is nothing to
 * view or download.
 * @param {string} clerkUserId
 * @param {string} fileId
 * @returns {Promise<object|null>}
 */
export async function getFileForUser(clerkUserId, fileId) {
  if (!mongoose.isValidObjectId(fileId)) return null;
  await connectToDatabase();

  const file = await MediaFile.findOne({ _id: fileId, status: 'active' }).lean();
  if (!file) return null;
  if (!(await canReadFile(clerkUserId, file))) return null;

  return toSerializable(file);
}

/**
 * List confirmed files visible to the user, newest first. Without a projectId
 * this returns the user's own files plus every project they are a member of.
 * @param {string} clerkUserId
 * @param {{projectId?: string}} filters
 * @returns {Promise<object[]>}
 */
export async function listFilesForUser(clerkUserId, { projectId } = {}) {
  await connectToDatabase();

  let filter;
  if (projectId) {
    if (!mongoose.isValidObjectId(projectId)) return [];
    const project = await getProjectById(clerkUserId, projectId);
    if (!project) return [];
    filter = { project: new mongoose.Types.ObjectId(projectId), status: 'active' };
  } else {
    const memberProjectIds = await ProjectMembership.find({
      user: clerkUserId,
      status: 'active',
    }).distinct('project');
    filter = {
      status: 'active',
      $or: [{ uploadedBy: clerkUserId, scope: 'user' }, { project: { $in: memberProjectIds } }],
    };
  }

  const files = await MediaFile.find(filter).sort({ createdAt: -1 }).lean();
  return files.map(toSerializable);
}

/**
 * Fresh presigned URL for viewing a file inline in the browser.
 * @param {object} file - serializable media file
 * @returns {Promise<{url: string, expiresAt: Date}>}
 */
export function createFileViewUrl(file) {
  return createPresignedDownloadUrl({ key: file.key, filename: file.filename, disposition: 'inline' });
}

/**
 * Fresh presigned URL that forces a download with the original file name.
 * @param {object} file - serializable media file
 * @returns {Promise<{url: string, expiresAt: Date}>}
 */
export function createFileDownloadUrl(file) {
  return createPresignedDownloadUrl({
    key: file.key,
    filename: file.filename,
    disposition: 'attachment',
  });
}

/**
 * Delete a file the user is allowed to delete, removing both the R2 object and
 * the metadata record.
 * @param {string} clerkUserId
 * @param {string} fileId
 * @returns {Promise<{ok: true} | {ok: false, code: string}>}
 */
export async function deleteFileForUser(clerkUserId, fileId) {
  if (!mongoose.isValidObjectId(fileId)) {
    return { ok: false, code: 'not_found' };
  }

  await connectToDatabase();
  const file = await MediaFile.findById(fileId).lean();
  if (!file) {
    return { ok: false, code: 'not_found' };
  }
  if (!(await canDeleteFile(clerkUserId, file))) {
    return { ok: false, code: 'forbidden' };
  }

  await deleteObject(file.key);
  await MediaFile.deleteOne({ _id: file._id });

  return { ok: true };
}

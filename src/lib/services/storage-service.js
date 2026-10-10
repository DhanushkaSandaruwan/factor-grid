import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getDownloadUrlTtl, getR2Client, getR2Config, getUploadUrlTtl } from '@/lib/r2';

/**
 * Low-level Cloudflare R2 object operations.
 *
 * Everything here is credential-bound and unaware of users or permissions —
 * access control lives in `media-file-service.js`. Uploads and downloads are
 * handed out as presigned URLs so file bytes never pass through the Next.js
 * server; `putObject` exists for the small direct-upload path.
 *
 * @see https://developers.cloudflare.com/r2/api/s3/presigned-urls/
 */

/**
 * Strip anything that could escape the key prefix or confuse the browser.
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
  const cleaned = String(name ?? '')
    // Control characters and path separators are never valid in a key segment.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[/\\]/g, '_')
    // Leading dots would create hidden or relative path segments.
    .replace(/^\.+/, '')
    .trim();
  return cleaned.slice(0, 180) || 'file';
}

/**
 * Build the R2 object key for a file. The file id segment guarantees
 * uniqueness even when two uploads share a file name.
 * @param {{scope: 'user'|'project', ownerId: string, fileId: string, filename: string}} parts
 * @returns {string}
 */
export function buildObjectKey({ scope, ownerId, fileId, filename }) {
  const prefix = scope === 'project' ? 'projects' : 'users';
  return `${prefix}/${ownerId}/${fileId}/${sanitizeFilename(filename)}`;
}

/**
 * Build a Content-Disposition header value that stays safe for non-ASCII and
 * quote-containing file names.
 * @param {string} filename
 * @param {'inline'|'attachment'} disposition
 * @returns {string}
 */
export function buildContentDisposition(filename, disposition) {
  const asciiFallback = sanitizeFilename(filename).replace(/["\\]/g, '');
  const encoded = encodeURIComponent(filename);
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

/**
 * Create a presigned PUT URL so a client can upload one object straight to R2.
 * The content type is part of the signature, so R2 rejects an upload that
 * declares a different type.
 * @param {{key: string, contentType: string}} target
 * @returns {Promise<{url: string, expiresAt: Date, contentType: string}>}
 */
export async function createPresignedUploadUrl({ key, contentType }) {
  const client = getR2Client();
  const { bucket } = getR2Config();
  const expiresIn = getUploadUrlTtl();

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn },
  );

  return { url, expiresAt: new Date(Date.now() + expiresIn * 1000), contentType };
}

/**
 * Create a presigned GET URL for viewing or downloading an object.
 * @param {{key: string, filename: string, disposition?: 'inline'|'attachment'}} target
 * @returns {Promise<{url: string, expiresAt: Date}>}
 */
export async function createPresignedDownloadUrl({ key, filename, disposition = 'inline' }) {
  const client = getR2Client();
  const { bucket } = getR2Config();
  const expiresIn = getDownloadUrlTtl();

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: buildContentDisposition(filename, disposition),
    }),
    { expiresIn },
  );

  return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
}

/**
 * Look up an object's size, content type and ETag without downloading it.
 * Used to confirm that a presigned upload actually landed.
 * @param {string} key
 * @returns {Promise<{size: number, contentType: string, etag: string}|null>} null when the object does not exist
 */
export async function headObject(key) {
  const client = getR2Client();
  const { bucket } = getR2Config();

  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      size: Number(head.ContentLength ?? 0),
      contentType: head.ContentType ?? '',
      etag: (head.ETag ?? '').replace(/"/g, ''),
    };
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    const name = error?.name ?? '';
    if (status === 404 || name === 'NotFound' || name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * Upload bytes straight to R2. Used by the direct-upload endpoint for small
 * files; large files should use presigned upload URLs instead.
 * @param {{key: string, body: Buffer|Uint8Array, contentType: string}} target
 * @returns {Promise<{etag: string}>}
 */
export async function putObject({ key, body, contentType }) {
  const client = getR2Client();
  const { bucket } = getR2Config();

  const result = await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );

  return { etag: (result.ETag ?? '').replace(/"/g, '') };
}

/**
 * Delete an object from R2. Deleting a missing key is not an error in S3, so
 * this resolves quietly either way.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function deleteObject(key) {
  const client = getR2Client();
  const { bucket } = getR2Config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

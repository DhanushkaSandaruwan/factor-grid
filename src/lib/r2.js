import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 client and configuration.
 *
 * R2 exposes an S3-compatible API, so the AWS SDK v3 talks to it once the
 * endpoint points at `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` and the
 * region is set to the placeholder value `auto`.
 *
 * Configuration is read lazily from the environment so the rest of the app
 * keeps working when R2 is not configured yet — only the storage endpoints
 * fail, with an explicit error.
 *
 * @see https://developers.cloudflare.com/r2/get-started/s3/
 */

/** Presigned upload URL lifetime in seconds (1 hour). */
export const DEFAULT_UPLOAD_URL_TTL = 3600;

/** Presigned download/view URL lifetime in seconds (15 minutes). */
export const DEFAULT_DOWNLOAD_URL_TTL = 900;

/** Default maximum object size in bytes (50 MB). */
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Read the R2 configuration from the environment.
 * @returns {{accountId: string, endpoint: string, accessKeyId: string, secretAccessKey: string, bucket: string, forcePathStyle: boolean}}
 */
function readConfig() {
  const accountId = (process.env.R2_ACCOUNT_ID ?? '').trim();
  const endpoint =
    (process.env.R2_ENDPOINT ?? '').trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return {
    accountId,
    endpoint,
    accessKeyId: (process.env.R2_ACCESS_KEY_ID ?? '').trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY ?? '').trim(),
    bucket: (process.env.R2_BUCKET_NAME ?? '').trim(),
    forcePathStyle: (process.env.R2_FORCE_PATH_STYLE ?? '').trim().toLowerCase() === 'true',
  };
}

/**
 * Whether every required R2 setting is present. Storage endpoints use this
 * to return a clear 503 instead of an opaque SDK failure.
 * @returns {boolean}
 */
export function isR2Configured() {
  const config = readConfig();
  return Boolean(config.endpoint && config.accessKeyId && config.secretAccessKey && config.bucket);
}

/**
 * Get the R2 configuration, throwing a descriptive error when incomplete.
 * @returns {{accountId: string, endpoint: string, accessKeyId: string, secretAccessKey: string, bucket: string, forcePathStyle: boolean}}
 */
export function getR2Config() {
  const config = readConfig();
  if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
    throw new Error(
      'Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
        'R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME (see .env.local.example).',
    );
  }
  return config;
}

/**
 * Maximum accepted object size in bytes, from `R2_MAX_FILE_SIZE_MB`.
 * @returns {number}
 */
export function getMaxFileSize() {
  const megabytes = Number(process.env.R2_MAX_FILE_SIZE_MB);
  if (Number.isFinite(megabytes) && megabytes > 0) {
    return Math.floor(megabytes * 1024 * 1024);
  }
  return DEFAULT_MAX_FILE_SIZE;
}

/**
 * Presigned upload URL lifetime in seconds, from `R2_UPLOAD_URL_TTL_SECONDS`.
 * @returns {number}
 */
export function getUploadUrlTtl() {
  const seconds = Number(process.env.R2_UPLOAD_URL_TTL_SECONDS);
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : DEFAULT_UPLOAD_URL_TTL;
}

/**
 * Presigned download/view URL lifetime in seconds, from
 * `R2_DOWNLOAD_URL_TTL_SECONDS`.
 * @returns {number}
 */
export function getDownloadUrlTtl() {
  const seconds = Number(process.env.R2_DOWNLOAD_URL_TTL_SECONDS);
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : DEFAULT_DOWNLOAD_URL_TTL;
}

// Cache the client across hot reloads / serverless invocations, mirroring the
// MongoDB connection cache in src/lib/db.js.
const clientCache = global._r2ClientCache || (global._r2ClientCache = { client: null });

/**
 * Get the shared S3Client pointed at the configured R2 bucket.
 * @returns {S3Client}
 */
export function getR2Client() {
  const { endpoint, accessKeyId, secretAccessKey, forcePathStyle } = getR2Config();
  if (!clientCache.client) {
    clientCache.client = new S3Client({
      // Required by the SDK, ignored by R2.
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      // Path style keeps bucket names containing dots working; R2 accepts both.
      forcePathStyle,
      // Without this the SDK stamps presigned PUT URLs with the CRC32 of an
      // empty body, which R2 then rejects when real bytes are uploaded.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }
  return clientCache.client;
}

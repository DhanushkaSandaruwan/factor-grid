import crypto from 'node:crypto';

/**
 * AES-256-GCM helpers for encrypting secrets (e.g. AI provider API keys)
 * at rest in MongoDB. The encryption key comes from the AI_ENCRYPTION_KEY
 * env var (64 hex chars = 32 bytes). A deterministic dev fallback keeps
 * local development working without the env var — never use it in prod.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_ENV_VAR = 'AI_ENCRYPTION_KEY';
const DEV_KEY_SECRET = 'factorgrid-dev-only-insecure-key';

let cachedKey = null;

/**
 * Resolve the 32-byte encryption key.
 * @returns {Buffer}
 */
function getEncryptionKey() {
  if (cachedKey) return cachedKey;

  const fromEnv = process.env[KEY_ENV_VAR];
  if (fromEnv && /^[0-9a-fA-F]{64}$/.test(fromEnv)) {
    cachedKey = Buffer.from(fromEnv, 'hex');
    return cachedKey;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${KEY_ENV_VAR} must be set to a 64-character hex string in production.`
    );
  }

  console.warn(
    `[crypto] ${KEY_ENV_VAR} not set — using insecure dev fallback. Do not use this in production.`
  );
  cachedKey = crypto.createHash('sha256').update(DEV_KEY_SECRET).digest();
  return cachedKey;
}

/**
 * Encrypt a UTF-8 string. Returns "iv:tag:ciphertext" (all hex).
 * @param {string} plainText
 * @returns {string}
 */
export function encryptSecret(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a payload produced by {@link encryptSecret}.
 * @param {string} payload
 * @returns {string}
 */
export function decryptSecret(payload) {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted secret payload.');
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

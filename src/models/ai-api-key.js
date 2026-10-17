import mongoose from 'mongoose';

/**
 * AI provider API key. Keys are stored AES-256-GCM encrypted (see
 * src/lib/utils/crypto.js) and rotated automatically by the AI service when
 * a key is rate-limited or exhausts its quota.
 */
const aiApiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    provider: { type: String, required: true, trim: true, default: 'groq' },
    /** Encrypted key material — never store plain text. */
    key: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'rate-limited'],
      default: 'active',
      index: true,
    },
    lastUsedAt: { type: Date },
    rateLimitedUntil: { type: Date },
  },
  { timestamps: true }
);

export const AiApiKey =
  mongoose.models.AiApiKey ?? mongoose.model('AiApiKey', aiApiKeySchema);

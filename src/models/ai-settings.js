import mongoose from 'mongoose';

/**
 * Singleton AI configuration: provider base URL, default model, system
 * prompt, and sampling temperature. Seeded with Groq defaults on first use;
 * editable later via the planned settings page.
 */
const aiSettingsSchema = new mongoose.Schema(
  {
    baseUrl: {
      type: String,
      required: true,
      trim: true,
      default: 'https://api.groq.com/openai/v1',
    },
    model: {
      type: String,
      required: true,
      trim: true,
      default: 'openai/gpt-oss-120b',
    },
    systemPrompt: {
      type: String,
      default:
        'You are FactorGrid AI, an analytical assistant embedded in the FactorGrid human-factors platform. ' +
        'Answer concisely, use clear formatting, and stay focused on the user’s questions.',
    },
    temperature: { type: Number, min: 0, max: 2, default: 0.3 },
    maxTokens: { type: Number, min: 1, max: 8192, default: 2048 },
    /** Map of tool name -> boolean. Missing keys default to enabled. */
    enabledTools: { type: Map, of: Boolean, default: () => new Map() },
  },
  { timestamps: true }
);

export const AiSettings =
  mongoose.models.AiSettings ?? mongoose.model('AiSettings', aiSettingsSchema);

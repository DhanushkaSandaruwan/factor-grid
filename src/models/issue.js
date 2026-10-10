import mongoose from 'mongoose';

/**
 * A human-factors issue registered within a project. Issue numbers auto-
 * increment per-project so the full ID displayed is "{prefix}-{number}".
 *
 * Packages store ObjectIds at creation time. If a Package document is later
 * deleted the reference remains intact — queries .populate() selectively.
 */
const issueSchema = new mongoose.Schema(
  {
    /** Human-readable ID: "{issueIdPrefix}-{number}", e.g. "HF-001". */
    issueId: { type: String, required: true, trim: true },

    /** The project this issue belongs to. */
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    /**
     * Incremented per-project so the UI can suggest the next available
     * number (displayed as "{prefix}-{nextNumber}").
     */
    issueNumber: { type: Number, required: true, min: 1 },

    /** Where the issue was first identified. */
    source: { type: String, trim: true, maxlength: 200, default: '' },

    /** Short title describing the issue. */
    title: { type: String, required: true, trim: true, maxlength: 200 },

    /** Packages (from the project wizard) that are relevant to this issue. */
    packages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Package' }],

    /** Detailed description of the issue. */
    description: { type: String, trim: true, maxlength: 4000, default: '' },

    /** What consequences this issue may lead to. */
    consequences: { type: String, trim: true, maxlength: 2000, default: '' },

    /** Current lifecycle status of the issue. */
    status: {
      type: String,
      enum: ['open', 'closed', 'transferred'],
      default: 'open',
      index: true,
    },

    /** Human-factors category of the issue: usability, safety or both. */
    issueType: {
      type: String,
      enum: ['usability', 'safety', 'both'],
      index: true,
    },

    /** User who reported / created the issue. */
    createdBy: { type: String, required: true, index: true },

    /**
     * Values for each Risk Assessment attribute selected for the project.
     * Keys are attribute names; numeric values adjusted with the stepper in
     * the registry panel. Stored per issue.
     */
    riskAttributeValues: { type: Map, of: Number, default: new Map() },

    /**
     * Values for each Action Attribute selected for the project. Text
     * attributes (SSRD ID, Source, …) store strings, Action Type stores
     * the selected dropdown option. Stored per issue.
     */
    actionAttributeValues: { type: Map, of: mongoose.Schema.Types.Mixed, default: new Map() },

    /**
     * Free-text recommendations recorded for this issue. Multiple entries
     * per issue, managed from the registry's Recommendation column. Each
     * recommendation carries its own requirements with links, evidence
     * files and an open/closed status.
     */
    recommendations: {
      type: [
        {
          text: { type: String, required: true, trim: true, maxlength: 4000 },
          requirements: {
            type: [
              {
                /** Requirement text, like a description. */
                text: { type: String, required: true, trim: true, maxlength: 4000 },

                /** Open or closed — toggled with the switch in the registry. */
                status: { type: String, enum: ['open', 'closed'], default: 'open' },

                /** Links (HFDR / PSID) attached to this requirement. */
                linkIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Link' }],

                /**
                 * Evidence media files. Each entry snapshots the media file
                 * metadata so the UI can render icons without extra fetches.
                 */
                evidence: {
                  type: [
                    {
                      fileId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'MediaFile',
                        required: true,
                      },
                      filename: { type: String, required: true, maxlength: 255 },
                      contentType: { type: String, required: true, maxlength: 255 },
                      size: { type: Number, required: true, min: 0 },
                    },
                  ],
                  default: [],
                },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, collection: 'issues' }
);

// Compound index so listing issues for a project is fast and sorted by creation.
issueSchema.index({ project: 1, createdAt: -1 });
// Ensure issueId is unique within a project (prefix + number is unique globally too).
issueSchema.index({ issueId: 1 }, { unique: true });

export const Issue = mongoose.models.Issue || mongoose.model('Issue', issueSchema);

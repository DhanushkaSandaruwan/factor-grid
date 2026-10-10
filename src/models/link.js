import mongoose from 'mongoose';

/**
 * A traceability link referenced by issue requirements. Two groups exist:
 * HFDR links and PSID links — both share the same shape and are distinguished
 * by `type`. Links are project-scoped so teams maintain their own registry.
 */
const linkSchema = new mongoose.Schema(
  {
    /** The project this link belongs to. */
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    /** Which link group this entry belongs to. */
    type: { type: String, enum: ['hfdr', 'psid'], required: true, index: true },

    /** The identifier shown to users — HFDR_ID for hfdr, PSID for psid. */
    code: { type: String, required: true, trim: true, maxlength: 100 },

    /** What the linked record covers. */
    description: { type: String, trim: true, maxlength: 2000, default: '' },

    /** Project packages this link relates to. */
    packages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Package' }],

    /** Issue IDs (e.g. "HF-001") this link references; free-form strings. */
    issueIds: [{ type: String, trim: true, maxlength: 100 }],

    /** Person responsible for the linked record. */
    lead: { type: String, trim: true, maxlength: 100, default: '' },

    /** External DOORS requirement identifier. */
    doorsId: { type: String, trim: true, maxlength: 100, default: '' },

    /** Clerk user id of the creator. */
    createdBy: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'links' }
);

// One code per type within a project.
linkSchema.index({ project: 1, type: 1, code: 1 }, { unique: true });

export const Link = mongoose.models.Link || mongoose.model('Link', linkSchema);

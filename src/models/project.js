import mongoose from 'mongoose';

/**
 * A human factors analysis project created through the new-project wizard.
 * Attribute selections store option names resolved at creation time;
 * packages reference Package documents.
 */
const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    client: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    issueIdPrefix: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
    hfAttributes: { type: [String], default: [] },
    riskAttributes: { type: [String], default: [] },
    actionAttributes: { type: [String], default: [] },
    packages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Package' }],
    createdBy: { type: String, required: true, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true, collection: 'projects' }
);

projectSchema.index({ issueIdPrefix: 1 }, { unique: true });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

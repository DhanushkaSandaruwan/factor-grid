import mongoose from 'mongoose';

/**
 * A frozen copy of a project's registry, taken on purpose (for example at a
 * review or sign-off). Baselines are never edited; they can be downloaded.
 */
const projectBaselineSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: 'Team member', maxlength: 200 },
    issueCount: { type: Number, default: 0 },
    /** Snapshot content: project settings, issues (with requirements, evidence) and links. */
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: 'project_baselines' }
);

projectBaselineSchema.index({ project: 1, createdAt: -1 });

export const ProjectBaseline =
  mongoose.models.ProjectBaseline || mongoose.model('ProjectBaseline', projectBaselineSchema);

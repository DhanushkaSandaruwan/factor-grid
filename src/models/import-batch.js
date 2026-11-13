import mongoose from 'mongoose';

/**
 * One uploaded registry file and what happened to it. The original file is
 * kept in object storage and never replaced, so every upload, including
 * rejected ones, can be downloaded again for an audit.
 */
const importBatchSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    fileName: { type: String, required: true, maxlength: 255 },
    contentType: { type: String, default: 'application/octet-stream', maxlength: 120 },
    size: { type: Number, required: true },
    /** Object key in R2 where the original bytes are stored. */
    key: { type: String, required: true, unique: true },
    uploadedBy: { type: String, required: true, index: true },
    uploadedByName: { type: String, default: 'Team member', maxlength: 200 },
    status: {
      type: String,
      enum: ['checked', 'rejected', 'imported', 'failed'],
      required: true,
      index: true,
    },
    issueCount: { type: Number, default: 0 },
    /** Problems found when the file was checked (line, column, message). */
    problems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    warnings: { type: [String], default: [] },
    /** What the import did: packages created or attached, issues created. */
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    message: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'import_batches' },
);

importBatchSchema.index({ project: 1, createdAt: -1 });

export const ImportBatch = mongoose.models.ImportBatch || mongoose.model('ImportBatch', importBatchSchema);

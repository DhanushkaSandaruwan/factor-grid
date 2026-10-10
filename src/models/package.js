import mongoose from 'mongoose';

/**
 * Reusable analysis package. Created from the project wizard and
 * attachable to many projects.
 */
const packageSchema = new mongoose.Schema(
  {
    packageId: { type: String, required: true, trim: true, uppercase: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    createdBy: { type: String, index: true },
  },
  { timestamps: true, collection: 'packages' }
);

packageSchema.index({ packageId: 1 }, { unique: true });

export const Package = mongoose.models.Package || mongoose.model('Package', packageSchema);

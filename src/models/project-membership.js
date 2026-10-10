import mongoose from 'mongoose';

/**
 * Project membership — a team member invitation and, once accepted, the
 * member's standing on a project. `user` holds the Clerk user id when the
 * invitee is a registered platform user (set at invite time, or on
 * acceptance for invite-by-email users).
 */
const membershipSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    user: { type: String, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    role: { type: String, enum: ['editor', 'viewer'], required: true },
    status: {
      type: String,
      enum: ['invited', 'active', 'declined'],
      default: 'invited',
      index: true,
    },
    personalMessage: { type: String, default: '' },
    invitedBy: { type: String, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

membershipSchema.index({ project: 1, email: 1 }, { unique: true });

export const ProjectMembership =
  mongoose.models.ProjectMembership ?? mongoose.model('ProjectMembership', membershipSchema);

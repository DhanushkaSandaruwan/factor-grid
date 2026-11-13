import mongoose from 'mongoose';

/**
 * In-app notification for one user. Created when someone mentions them in a
 * comment, or when an issue assigned to them is due soon or overdue.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    kind: { type: String, enum: ['mention', 'due_soon', 'overdue'], required: true },
    message: { type: String, required: true, maxlength: 300 },
    link: { type: String, required: true, maxlength: 300 },
    /** Prevents the same reminder being created twice. */
    dedupeKey: { type: String, unique: true, sparse: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'notifications' },
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

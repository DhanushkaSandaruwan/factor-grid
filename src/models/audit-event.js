import mongoose from 'mongoose';

/**
 * One entry in a project's activity log. Events are append-only: the app
 * writes them and never edits or deletes them, so the log can be used as
 * evidence of who changed what and when.
 */
const auditEventSchema = new mongoose.Schema({
  /** Project the event belongs to. */
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

  /** Issue the event relates to, when it is issue-scoped. */
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', index: true },

  /** Clerk user id of the person who made the change. */
  actor: { type: String, required: true, index: true },

  /** Display name of the actor at the time of the change. */
  actorName: { type: String, default: '', maxlength: 200 },

  /** Machine-readable action, e.g. "issue.created" or "requirement.updated". */
  action: { type: String, required: true, maxlength: 80 },

  /** Human-readable one-line description of the change. */
  summary: { type: String, required: true, maxlength: 500 },

  createdAt: { type: Date, default: Date.now, index: true },
});

auditEventSchema.index({ project: 1, createdAt: -1 });

export const AuditEvent =
  mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);

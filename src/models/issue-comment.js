import mongoose from 'mongoose';

/** Discussion on an issue. Comments are append-only except for deletion by their author or an editor. */
const issueCommentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
    author: { type: String, required: true },
    authorName: { type: String, default: 'Team member', maxlength: 200 },
    body: { type: String, required: true, maxlength: 2000 },
    /** Names mentioned with @ in the body, for display and later notifications. */
    mentions: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'issue_comments' }
);

issueCommentSchema.index({ issue: 1, createdAt: 1 });

export const IssueComment =
  mongoose.models.IssueComment || mongoose.model('IssueComment', issueCommentSchema);

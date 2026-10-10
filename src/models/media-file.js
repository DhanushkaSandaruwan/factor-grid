import mongoose from 'mongoose';

/**
 * A media file stored in Cloudflare R2. The document is the metadata record
 * that pairs a MongoDB entry with an R2 object key; the bytes themselves live
 * in the bucket and are reached through presigned URLs.
 *
 * Lifecycle: a record is created as `pending` when an upload URL is issued,
 * flips to `active` once the object is confirmed present in R2, and is marked
 * `failed` when a confirmation finds no object.
 */
const mediaFileSchema = new mongoose.Schema(
  {
    /** Full R2 object key, e.g. "projects/<id>/<fileId>/photo.jpg". Unique. */
    key: { type: String, required: true, unique: true, index: true },

    /** Original file name as supplied by the uploader. */
    filename: { type: String, required: true, trim: true, maxlength: 255 },

    /** MIME type, signed into the upload URL so R2 rejects mismatches. */
    contentType: { type: String, required: true, trim: true, maxlength: 255 },

    /** Object size in bytes, taken from R2 when the upload is confirmed. */
    size: { type: Number, required: true, min: 0, default: 0 },

    /** Upload lifecycle state. */
    status: {
      type: String,
      enum: ['pending', 'active', 'failed'],
      default: 'pending',
      index: true,
    },

    /** Who may reach the file: its uploader only, or the whole project team. */
    scope: { type: String, enum: ['user', 'project'], required: true },

    /** Owning project — required for `project` scope, absent for `user` scope. */
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },

    /** Clerk user id of the uploader. */
    uploadedBy: { type: String, required: true, index: true },

    /** Optional free-form tag chosen by the client (e.g. "issue-photo"). */
    label: { type: String, trim: true, maxlength: 100, default: '' },

    /** ETag reported by R2, useful for cache validation and debugging. */
    etag: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'media_files' },
);

mediaFileSchema.index({ project: 1, createdAt: -1 });
mediaFileSchema.index({ uploadedBy: 1, createdAt: -1 });

export const MediaFile = mongoose.models.MediaFile || mongoose.model('MediaFile', mediaFileSchema);

import mongoose from 'mongoose';

/**
 * Admin-manageable option rendered in the project wizard selectors.
 * Seeded once with platform defaults; admins can rename, reorder or
 * deactivate entries afterwards without code changes.
 */
const attributeOptionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['hf', 'risk', 'action', 'action_type'],
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    /**
     * For options that take free-form values: names another category whose
     * entries are the allowed values (e.g. the "Action Type" action
     * attribute draws its dropdown from the "action_type" category).
     */
    valueCategory: { type: String, trim: true, maxlength: 50, default: null },
  },
  { timestamps: true, collection: 'attribute_options' }
);

attributeOptionSchema.index({ category: 1, name: 1 }, { unique: true });

export const AttributeOption =
  mongoose.models.AttributeOption || mongoose.model('AttributeOption', attributeOptionSchema);

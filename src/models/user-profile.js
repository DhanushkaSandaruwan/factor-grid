import mongoose from 'mongoose';

/**
 * Profile information collected during post-auth onboarding.
 * One profile per Clerk user.
 */
const userProfileSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    contactNumber: { type: String, required: true, trim: true, maxlength: 32 },
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

export const UserProfile =
  mongoose.models.UserProfile || mongoose.model('UserProfile', userProfileSchema);

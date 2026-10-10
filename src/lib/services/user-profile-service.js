import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { UserProfile } from '@/models/user-profile';

const REQUIRED_FIELDS = ['firstName', 'lastName', 'contactNumber', 'companyName'];

export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  contactNumber: z
    .string()
    .trim()
    .min(7, 'Contact number must be at least 7 digits')
    .max(32)
    .regex(/^[+()\-\s\d]+$/, 'Contact number contains invalid characters'),
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
});

/**
 * Fetch the onboarding profile for a Clerk user, if it exists.
 * @param {string} clerkUserId
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(clerkUserId) {
  await connectToDatabase();
  return UserProfile.findOne({ clerkUserId }).lean();
}

/**
 * Determine whether every required onboarding field is filled.
 * @param {object|null} profile
 * @returns {boolean}
 */
export function isProfileComplete(profile) {
  if (!profile) return false;
  return REQUIRED_FIELDS.every(
    (field) => typeof profile[field] === 'string' && profile[field].trim().length > 0
  );
}

/**
 * Validate and upsert the onboarding profile for a Clerk user.
 * @param {string} clerkUserId
 * @param {unknown} payload
 * @returns {Promise<{ok: true, profile: object} | {ok: false, errors: Record<string, string>}>}
 */
export async function saveUserProfile(clerkUserId, payload) {
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    const errors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  await connectToDatabase();
  const profile = await UserProfile.findOneAndUpdate(
    { clerkUserId },
    { $set: { clerkUserId, ...parsed.data } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return { ok: true, profile };
}

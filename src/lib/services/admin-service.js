import { connectToDatabase } from '@/lib/db';
import { DeploymentSettings } from '@/models/deployment-settings';

const SETTINGS_ID = 'deployment';

/**
 * Make this user the deployment administrator if nobody holds the role yet.
 * The first person to finish onboarding in a fresh installation gets it.
 * Safe to call repeatedly and from concurrent requests.
 * @param {string} clerkUserId
 * @returns {Promise<boolean>} true when this call granted the role
 */
export async function claimAdminIfNone(clerkUserId) {
  await connectToDatabase();
  try {
    const result = await DeploymentSettings.updateOne(
      { _id: SETTINGS_ID, $or: [{ adminUserId: null }, { adminUserId: { $exists: false } }] },
      { $set: { adminUserId: clerkUserId } },
      { upsert: true },
    );
    return result.modifiedCount === 1 || result.upsertedCount === 1;
  } catch (error) {
    // A concurrent claim already created the document; the role is taken.
    if (error?.code === 11000) return false;
    throw error;
  }
}

/**
 * True when the given user administers this deployment.
 * @param {string|null} clerkUserId
 */
export async function isDeploymentAdmin(clerkUserId) {
  if (!clerkUserId) return false;
  await connectToDatabase();
  const settings = await DeploymentSettings.findById(SETTINGS_ID).lean();
  return settings?.adminUserId === clerkUserId;
}

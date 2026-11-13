import mongoose from 'mongoose';

/**
 * One document per installation (each customer runs their own copy). Holds
 * deployment-wide settings such as which user administers shared lists.
 */
const deploymentSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'deployment' },
    /** Clerk user id of the deployment administrator. */
    adminUserId: { type: String, default: null },
  },
  { timestamps: true, collection: 'deployment_settings' }
);

export const DeploymentSettings =
  mongoose.models.DeploymentSettings || mongoose.model('DeploymentSettings', deploymentSettingsSchema);

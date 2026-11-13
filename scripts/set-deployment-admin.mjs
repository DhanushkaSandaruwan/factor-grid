/**
 * One-off: make a user the administrator of this installation.
 *
 * Usage (reads MONGODB_URI from .env.local):
 *   node --env-file=.env.local scripts/set-deployment-admin.mjs <clerkUserId>
 *
 * Use this for installations set up before the attribute-list administration
 * existed. New installations assign the role automatically to the first user
 * who completes onboarding.
 */
import mongoose from 'mongoose';

const clerkUserId = process.argv[2];
if (!clerkUserId) {
  console.error('Usage: node --env-file=.env.local scripts/set-deployment-admin.mjs <clerkUserId>');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Run with --env-file=.env.local');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.db
  .collection('deployment_settings')
  .updateOne({ _id: 'deployment' }, { $set: { adminUserId: clerkUserId } }, { upsert: true });
console.log(`Deployment administrator set to ${clerkUserId}.`);
await mongoose.disconnect();

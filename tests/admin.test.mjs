/**
 * Integration tests for the deployment administrator role. Needs a disposable
 * database: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/hfdb_admin_test npm test
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const uri = process.env.TEST_MONGODB_URI;
const skip = uri ? false : 'set TEST_MONGODB_URI to run integration tests';
if (uri) process.env.MONGODB_URI = uri;

let mongoose;
let claimAdminIfNone;
let isDeploymentAdmin;

before(async () => {
  if (skip) return;
  mongoose = (await import('mongoose')).default;
  ({ claimAdminIfNone, isDeploymentAdmin } = await import('@/lib/services/admin-service'));
  const { connectToDatabase } = await import('@/lib/db');
  await connectToDatabase();
  await mongoose.connection.db.dropDatabase();
});

after(async () => {
  if (!skip && mongoose?.connection?.db) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
});

test('the first claim wins and later users are not administrators', { skip }, async () => {
  assert.equal(await claimAdminIfNone('first_user'), true);
  assert.equal(await claimAdminIfNone('second_user'), false);
  assert.equal(await isDeploymentAdmin('first_user'), true);
  assert.equal(await isDeploymentAdmin('second_user'), false);
  assert.equal(await isDeploymentAdmin(null), false);
});

test('concurrent claims grant the role to exactly one user', { skip }, async () => {
  await mongoose.connection.db.collection('deployment_settings').deleteMany({});
  const results = await Promise.all(['a', 'b', 'c', 'd'].map((u) => claimAdminIfNone(`race_${u}`)));
  assert.equal(results.filter(Boolean).length, 1);
});

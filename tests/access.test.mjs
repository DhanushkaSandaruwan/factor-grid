/**
 * Integration tests for project access rules. They need a disposable MongoDB:
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/hfdb_test npm test
 * Without that variable the suite is skipped, so your real data is never touched.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const uri = process.env.TEST_MONGODB_URI;
const skip = uri ? false : 'set TEST_MONGODB_URI to run integration tests';

if (uri) process.env.MONGODB_URI = uri;

let mongoose;
let getProjectAccess;
let guardProject;
let projectId;

before(async () => {
  if (skip) return;
  mongoose = (await import('mongoose')).default;
  ({ getProjectAccess } = await import('@/lib/services/access-service'));
  ({ guardProject } = await import('@/lib/api-guards'));
  const { connectToDatabase } = await import('@/lib/db');
  await connectToDatabase();
  const db = mongoose.connection.db;
  await db.dropDatabase();
  const owner = 'owner_1';
  const pid = new mongoose.Types.ObjectId();
  projectId = String(pid);
  await db.collection('projects').insertOne({
    _id: pid,
    title: 'Access test',
    client: 'c',
    issueIdPrefix: 'AT',
    createdBy: owner,
    hfAttributes: [],
    riskAttributes: [],
    actionAttributes: [],
    packages: [],
  });
  await db.collection('projectmemberships').insertMany([
    { project: pid, user: 'editor_1', email: 'e@x.io', role: 'editor', status: 'active' },
    { project: pid, user: 'viewer_1', email: 'v@x.io', role: 'viewer', status: 'active' },
    { project: pid, user: 'invited_1', email: 'i@x.io', role: 'editor', status: 'invited' },
  ]);
});

after(async () => {
  if (!skip && mongoose?.connection?.db) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
});

test('owner, editor and viewer roles resolve correctly', { skip }, async () => {
  assert.equal((await getProjectAccess('owner_1', projectId)).role, 'owner');
  assert.equal((await getProjectAccess('editor_1', projectId)).canEdit, true);
  const viewer = await getProjectAccess('viewer_1', projectId);
  assert.equal(viewer.role, 'viewer');
  assert.equal(viewer.canEdit, false);
});

test('users without an active membership get no access', { skip }, async () => {
  assert.equal(await getProjectAccess('invited_1', projectId), null);
  assert.equal(await getProjectAccess('stranger', projectId), null);
  assert.equal(await getProjectAccess(null, projectId), null);
});

test('write guard blocks viewers with 403 and allows editors', { skip }, async () => {
  const viewerWrite = await guardProject('viewer_1', projectId, { write: true });
  assert.equal(viewerWrite.response.status, 403);
  const viewerRead = await guardProject('viewer_1', projectId, { write: false });
  assert.equal(viewerRead.response, undefined);
  const editorWrite = await guardProject('editor_1', projectId, { write: true });
  assert.equal(editorWrite.response, undefined);
});

test('write guard returns 401 without a user and 404 for strangers', { skip }, async () => {
  assert.equal((await guardProject(null, projectId, { write: true })).response.status, 401);
  assert.equal((await guardProject('stranger', projectId)).response.status, 404);
});

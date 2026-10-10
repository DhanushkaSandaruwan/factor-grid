/**
 * Seed example projects into MongoDB for the signed-in user.
 *
 * Usage: node --env-file=.env.local scripts/seed-projects.mjs <clerkUserId>
 * Example: node --env-file=.env.local scripts/seed-projects.mjs user_2abc123XYZ
 *
 * Creates 5 example projects with varied attributes, risk assessments,
 * and action attributes so the dashboard layout can be previewed.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Run with: node --env-file=.env.local scripts/seed-projects.mjs <clerkUserId>');
  process.exit(1);
}

const EXAMPLE_PROJECTS = [
  {
    title: 'Aviation Cockpit Interface Review',
    client: 'SkyJet Airlines',
    description: 'Comprehensive human factors analysis of next-gen cockpit displays and alerting systems.',
    issueIdPrefix: 'ABC',
    hfAttributes: ['workload', 'situation-awareness', 'decision-making'],
    riskAttributes: ['severity', 'likelihood', 'detectability'],
    actionAttributes: ['priority', 'status'],
  },
  {
    title: 'Medical Device Usability Study',
    client: 'MedCore Systems',
    description: 'Evaluating nurse interaction with infusion pump interfaces in high-stress ICU environments.',
    issueIdPrefix: 'EFG',
    hfAttributes: ['usability', 'error-recovery', 'training-gap'],
    riskAttributes: ['patient-safety', 'use-error'],
    actionAttributes: ['mitigation', 'verification'],
  },
  {
    title: 'Autonomous Vehicle HMI Assessment',
    client: 'DriveNova Corp',
    description: 'Handover automation driver interaction and mode awareness study for Level 3 autonomy.',
    issueIdPrefix: 'HIJ',
    hfAttributes: ['trust', 'workload', 'complacency', 'situation-awareness'],
    riskAttributes: ['severity', 'exposure', 'controllability'],
    actionAttributes: ['priority', 'owner', 'status'],
  },
  {
    title: 'Industrial Control Room Evaluation',
    client: 'GridSecure Energy',
    description: 'Alarm management and procedural compliance review for nuclear power plant control rooms.',
    issueIdPrefix: 'KLN',
    hfAttributes: ['alarm-management', 'procedural-compliance', 'decision-making', 'communication'],
    riskAttributes: ['severity', 'likelihood'],
    actionAttributes: ['mitigation', 'priority'],
  },
  {
    title: 'Point-of-Sale Terminal Redesign',
    client: 'RetailMax Group',
    description: 'Cashier workstation analysis focusing on repetitive strain and scanning efficiency.',
    issueIdPrefix: 'MOP',
    hfAttributes: ['ergonomics', 'efficiency', 'error-rate'],
    riskAttributes: ['severity', 'frequency'],
    actionAttributes: ['owner', 'status'],
  },
];

const clerkUserId = process.argv[2];
if (!clerkUserId) {
  console.error('Usage: node --env-file=.env.local scripts/seed-projects.mjs <clerkUserId>');
  process.exit(1);
}

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    client: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    issueIdPrefix: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
    hfAttributes: { type: [String], default: [] },
    riskAttributes: { type: [String], default: [] },
    actionAttributes: { type: [String], default: [] },
    packages: [{ type: mongoose.Schema.Types.ObjectId }],
    createdBy: { type: String, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true, collection: 'projects' }
);

const membershipSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    user: { type: String, required: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'owner' },
    status: { type: String, enum: ['active', 'removed'], default: 'active' },
  },
  { timestamps: true, collection: 'projectmemberships' }
);

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const ProjectMembership =
  mongoose.models.ProjectMembership || mongoose.model('ProjectMembership', membershipSchema);

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

  const created = [];
  for (const data of EXAMPLE_PROJECTS) {
    const project = await Project.create({ ...data, createdBy: clerkUserId, packages: [] });
    await ProjectMembership.create({
      project: project._id,
      user: clerkUserId,
      role: 'owner',
      status: 'active',
    });
    created.push(project);
  }

  console.log(`\nCreated ${created.length} example projects for ${clerkUserId}:`);
  for (const p of created) {
    console.log(`  - ${p.title} (${p.issueIdPrefix})`);
  }
  console.log('\nVisit /dashboard to see the layout.');
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

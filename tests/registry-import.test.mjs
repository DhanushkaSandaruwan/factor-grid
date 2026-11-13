import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapHeaders, editDistance } from '@/lib/import/registry-format';
import { validateRegistryRows } from '@/lib/import/registry-validate';
import { parseCsv } from '@/lib/csv-parse';
import { readTable } from '@/lib/import/read-table';

const project = {
  title: 'Cockpit HF',
  hfAttributes: ['Recommendation', 'Operator error'],
  riskAttributes: ['Severity'],
  actionAttributes: ['Owner'],
};
const people = [{ userId: 'u_ann', firstName: 'Ann', lastName: 'Lee', email: 'ann@x.io', name: 'Ann Lee' }];
const ctx = {
  people,
  projectPackages: [{ _id: 'p1', packageId: 'PKG-CABIN' }],
  catalog: new Map([
    ['pkg-cabin', { _id: 'p1', packageId: 'PKG-CABIN' }],
    ['pkg-wing', { _id: 'p2', packageId: 'PKG-WING' }],
  ]),
  existingIssueIds: new Set(['CH-001']),
};
const HEADER = [
  'Project',
  'Issue ID',
  'Title',
  'Status',
  'Issue type',
  'Assignee',
  'Due date',
  'Closed on',
  'Closed by',
  'Signed name',
  'Source',
  'Packages',
  'Description',
  'Consequences',
  'Recommendation no.',
  'Recommendation',
  'Requirement',
  'Requirement status',
  'Linked HFDR/PSID',
  'Evidence files',
  'HF: Operator error',
  'Risk: Severity',
  'Action: Owner',
];
const row = (over = {}) => {
  const base = Object.fromEntries(HEADER.map((h) => [h, '']));
  base.Project = 'Cockpit HF';
  return { ...base, ...over };
};
const table = (...rows) => [HEADER, ...rows.map((r) => HEADER.map((h) => r[h] ?? ''))];

test('header mapping suggests the closest attribute name for a typo', () => {
  const bad = HEADER.map((h) => (h === 'Risk: Severity' ? 'Risk: Severty' : h));
  const { problems } = mapHeaders(bad, project);
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /Did you mean “Risk: Severity”/);
});

test('header mapping flags a missing title column', () => {
  const { problems } = mapHeaders(['Project', 'Source'], project);
  assert.ok(problems.some((p) => p.column === 'title'));
});

test('editDistance counts single-character changes', () => {
  assert.equal(editDistance('severity', 'severty'), 1);
  assert.equal(editDistance('abc', 'abc'), 0);
});

test('a clean file produces issues, recommendations, requirements and attribute values', () => {
  const rows = table(
    row({
      Project: 'Cockpit HF',
      Title: 'Mode confusion',
      Status: 'open',
      'Issue type': 'safety',
      Assignee: 'Ann Lee',
      'Due date': '2030-05-01',
      Packages: 'PKG-CABIN; PKG-WING',
      'Recommendation no.': '01',
      Recommendation: 'Add indicator',
      Requirement: 'Visible in both seats',
      'Requirement status': 'closed',
      'HF: Operator error': 'Yes',
      'Risk: Severity': '3',
      'Action: Owner': 'Ann',
    }),
    row({ Requirement: 'Trained crews', 'Requirement status': 'open' }),
    row({ 'Recommendation no.': '02', Recommendation: 'Second rec' }),
  );
  const result = validateRegistryRows(rows, project, ctx);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  const [issue] = result.issues;
  assert.equal(issue.assigneeId, 'u_ann');
  assert.equal(issue.issueType, 'safety');
  assert.deepEqual(issue.attributes, {
    hf: { 'Operator error': true },
    risk: { Severity: 3 },
    action: { Owner: 'Ann' },
  });
  assert.equal(issue.recommendations.length, 2);
  assert.equal(issue.recommendations[0].requirements.length, 2);
  assert.deepEqual(result.packagesToCreate, []);
  assert.deepEqual(result.packagesToAdd, ['PKG-WING']);
  assert.deepEqual(result.counts, { issues: 1, recommendations: 2, requirements: 2 });
});

test('unknown packages are planned for creation; invalid names are errors', () => {
  const rows = table(row({ Title: 'Packages test', Packages: 'NEW-ONE; bad<name' }));
  const result = validateRegistryRows(rows, project, ctx);
  assert.deepEqual(result.packagesToCreate, ['NEW-ONE']);
  assert.ok(result.errors.some((e) => e.column === 'Packages' && /bad<name/.test(e.message)));
});

test('wrong project, unknown assignee, closed status and bad numbers are reported with line and column', () => {
  const rows = table(
    row({
      Project: 'Other project',
      Title: 'Bad row',
      Status: 'closed',
      Assignee: 'Zoe',
      'Risk: Severity': 'high',
      'Due date': '31/12/2030',
    }),
  );
  const result = validateRegistryRows(rows, project, ctx);
  const columns = result.errors.map((e) => e.column);
  for (const col of ['Project', 'Status', 'Assignee', 'Risk: Severity', 'Due date']) {
    assert.ok(columns.includes(col), `missing error for ${col}`);
  }
  assert.ok(result.errors.every((e) => e.line === 2));
  assert.equal(result.ok, false);
});

test('continuation rows may not repeat issue details or attribute values', () => {
  const rows = table(
    row({ Title: 'First', Recommendation: 'Rec' }),
    row({ Description: 'Should be blank here', 'Risk: Severity': '2' }),
  );
  const result = validateRegistryRows(rows, project, ctx);
  assert.ok(result.errors.some((e) => e.line === 3 && e.column === 'Description'));
  assert.ok(result.errors.some((e) => e.line === 3 && e.column === 'Risk: Severity'));
});

test('a requirement without a recommendation above it is an error', () => {
  const rows = table(row({ Title: 'Orphan', Requirement: 'Floating requirement' }));
  const result = validateRegistryRows(rows, project, ctx);
  assert.ok(result.errors.some((e) => e.column === 'Requirement'));
});

test('closed issues and re-used issue IDs are refused', () => {
  const rows = table(
    row({ Title: 'Already there', 'Issue ID': 'CH-001' }),
    row({ Title: 'Closed one', Status: 'closed' }),
  );
  const result = validateRegistryRows(rows, project, ctx);
  assert.ok(result.errors.some((e) => e.column === 'Issue ID'));
  assert.ok(result.errors.some((e) => e.column === 'Status' && /sign-off/.test(e.message)));
});

test('an empty or header-only file is refused', () => {
  assert.equal(validateRegistryRows([HEADER], project, ctx).ok, false);
  assert.equal(validateRegistryRows([], project, ctx).ok, false);
});

test('parseCsv and readTable read CSV text', async () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y",z\r\n')[1], ['x, y', 'z']);
  const read = await readTable(Buffer.from('Title\r\nHello there\r\n'), 'data.csv');
  assert.deepEqual(read.rows, [['Title'], ['Hello there']]);
  assert.ok((await readTable(Buffer.from('x'), 'data.pdf')).error);
});

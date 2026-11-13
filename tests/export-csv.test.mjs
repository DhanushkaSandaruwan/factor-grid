import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRegistryTable, csvCell, toCsv } from '@/lib/export-csv';

test('csvCell quotes commas, quotes and newlines', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
});

test('csvCell neutralises spreadsheet formulas', () => {
  assert.match(csvCell('=HYPERLINK("x")'), /'=HYPERLINK/);
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('-cmd'), "'-cmd");
});

const project = {
  title: 'Access test',
  hfAttributes: ['Recommendation', 'Operator error'],
  riskAttributes: ['Severity'],
  actionAttributes: ['Owner'],
};
const links = [{ _id: 'L1', type: 'hfdr', code: 'HF-77' }];
const issues = [
  {
    issueId: 'EDG-001',
    title: 'Mode confusion',
    status: 'open',
    packages: [{ packageId: 'PKG-A' }],
    hfAttributeValues: { 'Operator error': true },
    riskAttributeValues: { Severity: 4 },
    actionAttributeValues: { Owner: 'Ann' },
    recommendations: [
      {
        text: 'Add a mode indicator',
        requirements: [
          {
            text: 'Show mode on the HUD',
            status: 'closed',
            linkIds: ['L1'],
            evidence: [{ filename: 'test.pdf' }],
          },
          { text: 'Train crews', status: 'open', linkIds: [], evidence: [] },
        ],
      },
    ],
  },
  { issueId: 'EDG-002', title: 'No work yet', status: 'open', recommendations: [] },
];

test('one row per requirement, with links, evidence and attributes', () => {
  const { header, rows } = buildRegistryTable({ project, issues, links });
  assert.equal(rows.length, 3);
  const col = (name) => header.indexOf(name);
  assert.equal(header[0], 'Project');
  assert.equal(rows[0][0], 'Access test');
  assert.equal(rows[0][col('Requirement')], 'Show mode on the HUD');
  assert.equal(rows[0][col('Linked HFDR/PSID')], 'HF:HF-77');
  assert.equal(rows[0][col('Evidence files')], 'test.pdf');
  assert.equal(rows[0][col('HF: Operator error')], 'Yes');
  assert.equal(rows[0][col('Risk: Severity')], 4);
  assert.equal(rows[0][col('Action: Owner')], 'Ann');
  assert.equal(rows[0][col('Packages')], 'PKG-A');
});

test('issues without requirements still produce one row', () => {
  const { header, rows } = buildRegistryTable({ project, issues, links });
  const last = rows[2];
  assert.equal(last[header.indexOf('Issue ID')], 'EDG-002');
  assert.equal(last[header.indexOf('Requirement')], '');
});

test('toCsv produces header plus rows with CRLF endings', () => {
  const csv = toCsv(buildRegistryTable({ project, issues, links }));
  const lines = csv.split('\r\n').filter(Boolean);
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Project,Issue ID,Title,/);
});

test('issue details appear once per block; later rows only carry what is new', () => {
  const project2 = { title: 'Block test', hfAttributes: [], riskAttributes: [], actionAttributes: [] };
  const issue = {
    issueId: 'B-1',
    title: 'Block issue',
    status: 'open',
    recommendations: [
      { text: 'Rec one', requirements: [{ text: 'R1a', status: 'open' }, { text: 'R1b', status: 'closed' }] },
      { text: 'Rec two', requirements: [{ text: 'R2a', status: 'open' }] },
    ],
  };
  const { header, rows } = buildRegistryTable({ project: project2, issues: [issue], links: [] });
  const col = (name) => header.indexOf(name);
  assert.equal(rows.length, 3);
  assert.equal(rows[0][col('Issue ID')], 'B-1');
  assert.equal(rows[0][col('Recommendation')], 'Rec one');
  assert.equal(rows[1][col('Issue ID')], '');
  assert.equal(rows[1][col('Recommendation')], '');
  assert.equal(rows[1][col('Requirement')], 'R1b');
  assert.equal(rows[2][col('Issue ID')], '');
  assert.equal(rows[2][col('Recommendation no.')], '02');
  assert.equal(rows[2][col('Recommendation')], 'Rec two');
  assert.equal(rows[2][col('Requirement')], 'R2a');
  assert.ok(rows.every((r) => r[0] === 'Block test'));
});

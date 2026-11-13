/**
 * Registry export as CSV. Pure functions only (no database access), so the
 * same output is produced by the API and by tests.
 *
 * Layout: one block per issue. The issue's details, its first recommendation
 * and its first requirement sit on the block's first row. Further
 * recommendations and requirements get their own rows with the issue columns
 * left blank, so the issue is not repeated. Every row carries the project name.
 * An issue without requirements still gets one row, so nothing is lost.
 */

import { isDerivedHfAttribute } from '@/lib/attribute-rules';

/** Spreadsheet programs run cells starting with these characters as formulas. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Escape one CSV cell: quote when needed and neutralise spreadsheet formulas.
 * @param {unknown} value
 * @returns {string}
 */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Date as YYYY-MM-DD, or an empty string. */
function day(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

/** Issue columns (after Project). Blank on continuation rows. */
const ISSUE_HEADERS = [
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
];
const RECOMMENDATION_HEADERS = ['Recommendation no.', 'Recommendation'];
const REQUIREMENT_HEADERS = ['Requirement', 'Requirement status', 'Linked HFDR/PSID', 'Evidence files'];

/**
 * Build the registry rows for a project.
 * @param {{ project: object, issues: object[], links: object[] }} input
 * @returns {{ header: string[], rows: string[][] }}
 */
export function buildRegistryTable({ project, issues, links }) {
  const linkById = new Map(links.map((link) => [String(link._id), link]));
  const customHf = (project.hfAttributes ?? []).filter((name) => !isDerivedHfAttribute(name));
  const risk = project.riskAttributes ?? [];
  const action = project.actionAttributes ?? [];
  const attributeHeaders = [
    ...customHf.map((name) => `HF: ${name}`),
    ...risk.map((name) => `Risk: ${name}`),
    ...action.map((name) => `Action: ${name}`),
  ];
  const header = [
    'Project',
    ...ISSUE_HEADERS,
    ...RECOMMENDATION_HEADERS,
    ...REQUIREMENT_HEADERS,
    ...attributeHeaders,
  ];
  const blanks = (n) => Array.from({ length: n }, () => '');
  const projectName = project.title ?? '';

  const rows = [];
  for (const issue of issues) {
    const issueCells = [
      issue.issueId,
      issue.title,
      issue.status,
      issue.issueType ?? '',
      issue.assignee ?? '',
      day(issue.dueDate),
      day(issue.closedAt),
      issue.closedByName ?? '',
      issue.signedName ?? '',
      issue.source ?? '',
      (issue.packages ?? []).map((pkg) => (typeof pkg === 'object' ? pkg.packageId : pkg)).join('; '),
      issue.description ?? '',
      issue.consequences ?? '',
    ];
    const hfValues = issue.hfAttributeValues ?? {};
    const riskValues = issue.riskAttributeValues ?? {};
    const actionValues = issue.actionAttributeValues ?? {};
    const attributeCells = [
      ...customHf.map((name) => (hfValues[name] === true ? 'Yes' : 'No')),
      ...risk.map((name) => riskValues[name] ?? ''),
      ...action.map((name) => actionValues[name] ?? ''),
    ];

    const makeRow = ({ first, recStart, recNo, rec, req }) => {
      const recCells = recStart ? [String(recNo).padStart(2, '0'), rec.text ?? ''] : ['', ''];
      const reqCells = req
        ? [
            req.text ?? '',
            req.status ?? 'open',
            (req.linkIds ?? [])
              .map((id) => linkById.get(String(id)))
              .filter(Boolean)
              .map((link) => `${link.type === 'hfdr' ? 'HF' : 'PS'}:${link.code}`)
              .join('; '),
            (req.evidence ?? []).map((file) => file.filename).join('; '),
          ]
        : ['', '', '', ''];
      return [
        projectName,
        ...(first ? issueCells : blanks(ISSUE_HEADERS.length)),
        ...recCells,
        ...reqCells,
        ...(first ? attributeCells : blanks(attributeHeaders.length)),
      ];
    };

    const recommendations = issue.recommendations ?? [];
    if (recommendations.length === 0) {
      rows.push(makeRow({ first: true, recStart: false }));
      continue;
    }

    let first = true;
    recommendations.forEach((rec, index) => {
      const requirements = rec.requirements ?? [];
      if (requirements.length === 0) {
        rows.push(makeRow({ first, recStart: true, recNo: index + 1, rec }));
        first = false;
        return;
      }
      requirements.forEach((req, reqIndex) => {
        rows.push(makeRow({ first, recStart: reqIndex === 0, recNo: index + 1, rec, req }));
        first = false;
      });
    });
  }

  return { header, rows };
}

/**
 * Serialise a table to CSV text with CRLF line endings.
 * @param {{ header: string[], rows: unknown[][] }} table
 */
export function toCsv(table) {
  const lines = [table.header, ...table.rows].map((row) => row.map(csvCell).join(','));
  return lines.join('\r\n') + '\r\n';
}

/** Full CSV for a project's registry, ready to send to the browser. */
export function buildRegistryCsv(input) {
  return toCsv(buildRegistryTable(input));
}

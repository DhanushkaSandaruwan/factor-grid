/**
 * The registry import format. It is the same layout the registry export
 * produces, so an exported file can be checked and imported as it is.
 *
 * One block per issue: the first row carries the issue's details, its first
 * recommendation and its first requirement. Later rows of the same issue leave
 * the issue columns blank; a new recommendation starts with its text.
 * Pure functions only.
 */

import { isDerivedHfAttribute } from '@/lib/attribute-rules';

/** Fixed columns, in export order. */
export const FIXED_COLUMNS = [
  { key: 'project', header: 'Project', scope: 'row' },
  { key: 'issueId', header: 'Issue ID', scope: 'info' },
  { key: 'title', header: 'Title', scope: 'issue' },
  { key: 'status', header: 'Status', scope: 'issue' },
  { key: 'issueType', header: 'Issue type', scope: 'issue' },
  { key: 'assignee', header: 'Assignee', scope: 'issue' },
  { key: 'dueDate', header: 'Due date', scope: 'issue' },
  { key: 'closedOn', header: 'Closed on', scope: 'info' },
  { key: 'closedBy', header: 'Closed by', scope: 'info' },
  { key: 'signedName', header: 'Signed name', scope: 'info' },
  { key: 'source', header: 'Source', scope: 'issue' },
  { key: 'packages', header: 'Packages', scope: 'issue' },
  { key: 'description', header: 'Description', scope: 'issue' },
  { key: 'consequences', header: 'Consequences', scope: 'issue' },
  { key: 'recNo', header: 'Recommendation no.', scope: 'info' },
  { key: 'recommendation', header: 'Recommendation', scope: 'recommendation' },
  { key: 'requirement', header: 'Requirement', scope: 'requirement' },
  { key: 'requirementStatus', header: 'Requirement status', scope: 'requirement' },
  { key: 'links', header: 'Linked HFDR/PSID', scope: 'unsupported' },
  { key: 'evidence', header: 'Evidence files', scope: 'unsupported' },
];

/** Attribute columns for this project, named exactly as the export names them. */
export function attributeColumns(project) {
  const hf = (project.hfAttributes ?? []).filter((name) => !isDerivedHfAttribute(name));
  return [
    ...hf.map((name) => ({ key: `hf:${name}`, header: `HF: ${name}`, kind: 'hf', name })),
    ...(project.riskAttributes ?? []).map((name) => ({
      key: `risk:${name}`,
      header: `Risk: ${name}`,
      kind: 'risk',
      name,
    })),
    ...(project.actionAttributes ?? []).map((name) => ({
      key: `action:${name}`,
      header: `Action: ${name}`,
      kind: 'action',
      name,
    })),
  ];
}

/** Every column the project's format has, in order. */
export function formatColumns(project) {
  return [...FIXED_COLUMNS.map((c) => ({ ...c })), ...attributeColumns(project)];
}

/** Columns that belong to an issue's first row only. */
export function isIssueLevel(column) {
  return column.scope === 'issue' || column.kind !== undefined;
}

const norm = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

/** Edit distance, used only to suggest the closest correct column name. */
export function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * Map the header row onto the project's format.
 * @returns {{ columns: Record<string, number>, problems: {line: number, column: string, message: string}[], warnings: string[] }}
 */
export function mapHeaders(headerRow, project) {
  const expected = formatColumns(project);
  const byName = new Map(expected.map((c) => [norm(c.header), c]));
  const columns = {};
  const problems = [];
  const warnings = [];

  headerRow.forEach((cell, index) => {
    const text = String(cell ?? '').trim();
    if (!text) return;
    const match = byName.get(norm(text));
    if (match) {
      if (columns[match.key] === undefined) columns[match.key] = index;
      else problems.push({ line: 1, column: text, message: `The column “${text}” appears twice.` });
      return;
    }
    // Unknown column: suggest the closest name of the same kind.
    const candidates = expected.filter((c) =>
      text.includes(':') ? c.header.includes(':') : !c.header.includes(':'),
    );
    const best = candidates
      .map((c) => ({ c, d: editDistance(norm(c.header), norm(text)) }))
      .sort((x, y) => x.d - y.d)[0];
    const hint = best && best.d <= 3 ? ` Did you mean “${best.c.header}”?` : '';
    problems.push({ line: 1, column: text, message: `Unknown column “${text}”.${hint}` });
  });

  for (const required of ['project', 'title']) {
    if (columns[required] === undefined) {
      problems.push({
        line: 1,
        column: required,
        message: `Missing the “${FIXED_COLUMNS.find((c) => c.key === required).header}” column.`,
      });
    }
  }
  for (const column of expected) {
    if (column.kind && columns[column.key] === undefined) {
      warnings.push(`The “${column.header}” column is missing. Its values will not be imported.`);
    }
  }
  for (const column of FIXED_COLUMNS.filter((c) => c.scope === 'unsupported')) {
    if (columns[column.key] !== undefined) {
      warnings.push(
        `The “${column.header}” column is read-only in the export. Its values will not be imported.`,
      );
    }
  }
  return { columns, problems, warnings };
}

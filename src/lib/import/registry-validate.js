/**
 * Checks a registry file row by row against the project. Pure: the caller
 * supplies the project's people, packages and existing issue ids. Nothing is
 * written here. Every problem is reported with its line and column so the user
 * can correct the file and upload it again.
 */

import { matchPerson } from '@/lib/mention-match';
import { formatColumns, isIssueLevel, mapHeaders } from './registry-format';

const PACKAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ERRORS = 300;
const YES = ['yes', 'y', 'true', '1'];
const NO = ['no', 'n', 'false', '0'];

/**
 * @param {string[][]} rows - header row first
 * @param {{ title: string, hfAttributes?: string[], riskAttributes?: string[], actionAttributes?: string[] }} project
 * @param {{
 *   people: { userId: string, name: string, firstName?: string, lastName?: string, email?: string }[],
 *   projectPackages: { _id: string, packageId: string }[],
 *   catalog: Map<string, { _id: string, packageId: string }>,
 *   existingIssueIds: Set<string>,
 * }} ctx
 */
export function validateRegistryRows(rows, project, ctx) {
  const errors = [];
  const warnings = [];
  const issues = [];
  const packagesToCreate = new Set();
  const packagesToAdd = new Set();
  const seenIssueIds = new Set();
  const counts = { issues: 0, recommendations: 0, requirements: 0 };

  const finish = () => ({
    errors,
    warnings,
    issues,
    packagesToCreate: [...packagesToCreate],
    packagesToAdd: [...packagesToAdd],
    counts,
    ok: errors.length === 0,
  });

  if (!rows || rows.length < 2) {
    errors.push({ line: 1, column: '', message: 'The file has no issues below the header row.' });
    return finish();
  }

  const header = mapHeaders(rows[0], project);
  errors.push(...header.problems);
  warnings.push(...header.warnings);
  if (header.problems.length > 0) return finish();

  const { columns } = header;
  const attributeCols = formatColumns(project).filter((c) => c.kind);
  const issueCols = formatColumns(project).filter((c) => isIssueLevel(c) && !c.kind);
  const projectTitle = String(project.title).trim();
  const projectLower = projectTitle.toLowerCase();
  const existingPackages = new Map(
    (ctx.projectPackages ?? []).map((p) => [String(p.packageId).toLowerCase(), String(p._id)]),
  );
  let current = null;

  const pushError = (line, column, message) => {
    if (errors.length < MAX_ERRORS) errors.push({ line, column, message });
  };
  const cellOf = (row, key) => (columns[key] === undefined ? '' : String(row[columns[key]] ?? '').trim());

  rows.slice(1).forEach((row, index) => {
    const line = index + 2;
    const cell = (key) => cellOf(row, key);
    const titleHeader = 'Title';

    const projectName = cell('project');
    if (!projectName) pushError(line, 'Project', `Fill in the project name (“${projectTitle}”).`);
    else if (projectName.toLowerCase() !== projectLower) {
      pushError(line, 'Project', `This row belongs to “${projectName}”, not “${projectTitle}”.`);
    }

    if (cell('title') !== '') {
      counts.issues += 1;
      current = {
        line,
        title: cell('title'),
        status: 'open',
        issueType: '',
        assigneeId: '',
        assignee: '',
        dueDate: null,
        source: cell('source'),
        description: cell('description'),
        consequences: cell('consequences'),
        packageNames: [],
        recommendations: [],
        attributes: { hf: {}, risk: {}, action: {} },
      };
      issues.push(current);
      validateIssueFields(line, row, current);
      const issueId = cell('issueId');
      if (issueId) {
        if (ctx.existingIssueIds?.has(issueId)) {
          pushError(
            line,
            'Issue ID',
            `${issueId} is already registered in this project. Clear the Issue ID to import this issue as new.`,
          );
        } else if (seenIssueIds.has(issueId)) {
          pushError(line, 'Issue ID', `${issueId} appears twice in this file.`);
        }
        seenIssueIds.add(issueId);
      }
      validateAttributes(line, row, current);
    } else {
      if (!current) {
        pushError(line, titleHeader, 'Start each issue with a title on its first row.');
        return;
      }
      for (const col of issueCols) {
        if (cell(col.key) !== '' && columns[col.key] !== undefined) {
          pushError(
            line,
            col.header,
            'Issue details belong on the first row of the issue. Leave this cell blank.',
          );
        }
      }
      for (const col of attributeCols) {
        if (cell(col.key) !== '') {
          pushError(
            line,
            col.header,
            'Attribute values belong on the first row of the issue. Leave this cell blank.',
          );
        }
      }
    }

    if (!current) return;
    const recText = cell('recommendation');
    if (recText) {
      if (recText.length > 4000)
        pushError(line, 'Recommendation', 'Recommendation must be 4000 characters or fewer.');
      current.recommendations.push({ line, text: recText, requirements: [] });
      counts.recommendations += 1;
    }
    const reqText = cell('requirement');
    const reqStatus = (cell('requirementStatus') || 'open').toLowerCase();
    if (reqText) {
      const rec = current.recommendations[current.recommendations.length - 1];
      if (!rec) {
        pushError(
          line,
          'Requirement',
          'A requirement needs a recommendation above it. Fill in Recommendation on this row or an earlier row of this issue.',
        );
      } else if (reqText.length > 4000) {
        pushError(line, 'Requirement', 'Requirement must be 4000 characters or fewer.');
      } else if (!['open', 'closed'].includes(reqStatus)) {
        pushError(line, 'Requirement status', 'Use open or closed.');
      } else {
        rec.requirements.push({ line, text: reqText, status: reqStatus });
        counts.requirements += 1;
      }
    } else if (cell('requirementStatus')) {
      pushError(line, 'Requirement status', 'Requirement status needs a requirement on the same row.');
    }
  });

  return finish();

  function validateIssueFields(line, row, issue) {
    const cell = (key) => cellOf(row, key);
    if (issue.title.length < 3 || issue.title.length > 200) {
      pushError(line, 'Title', 'Title must be 3 to 200 characters.');
    }
    const status = (cell('status') || 'open').toLowerCase();
    if (status === 'closed') {
      pushError(
        line,
        'Status',
        'Closed issues are closed in the app with a sign-off. Use open or transferred here.',
      );
    } else if (!['open', 'transferred'].includes(status)) {
      pushError(line, 'Status', 'Use open or transferred.');
    } else {
      issue.status = status;
    }

    const type = cell('issueType').toLowerCase();
    if (type && !['usability', 'safety', 'both'].includes(type)) {
      pushError(line, 'Issue type', 'Use usability, safety or both.');
    } else {
      issue.issueType = type;
    }

    const assignee = cell('assignee');
    if (assignee) {
      const person = matchPerson(assignee, ctx.people ?? []);
      if (!person) {
        pushError(
          line,
          'Assignee',
          `“${assignee}” does not match one member of this project. Use the name or email shown in the project team.`,
        );
      } else {
        issue.assigneeId = person.userId;
        issue.assignee = person.name;
      }
    }

    const due = cell('dueDate');
    if (due) {
      if (!DATE.test(due) || Number.isNaN(Date.parse(due))) {
        pushError(line, 'Due date', 'Use the form YYYY-MM-DD.');
      } else {
        issue.dueDate = due;
      }
    }

    if (issue.source.length > 200) pushError(line, 'Source', 'Source must be 200 characters or fewer.');
    if (issue.description.length > 4000)
      pushError(line, 'Description', 'Description must be 4000 characters or fewer.');
    if (issue.consequences.length > 2000)
      pushError(line, 'Consequences', 'Consequences must be 2000 characters or fewer.');

    const seen = new Set();
    for (const raw of cell('packages')
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)) {
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      issue.packageNames.push(raw);
      if (existingPackages.has(key)) continue;
      if (ctx.catalog?.has(key)) {
        packagesToAdd.add(ctx.catalog.get(key).packageId);
        continue;
      }
      if (raw.length < 2 || raw.length > 50 || !PACKAGE_NAME.test(raw)) {
        pushError(
          line,
          'Packages',
          `“${raw}” is not a valid package ID. Use 2 to 50 letters, numbers, spaces, “-” or “_”.`,
        );
      } else {
        packagesToCreate.add(raw.toUpperCase());
      }
    }
  }

  function validateAttributes(line, row, issue) {
    for (const col of attributeCols) {
      const raw = cellOf(row, col.key);
      if (!raw) continue;
      if (col.kind === 'hf') {
        if (YES.includes(raw.toLowerCase())) issue.attributes.hf[col.name] = true;
        else if (NO.includes(raw.toLowerCase())) issue.attributes.hf[col.name] = false;
        else pushError(line, col.header, 'Use Yes or No.');
      } else if (col.kind === 'risk') {
        if (/^\d+$/.test(raw)) issue.attributes.risk[col.name] = Number(raw);
        else pushError(line, col.header, 'Use a whole number, 0 or more.');
      } else if (raw.length > 500) {
        pushError(line, col.header, 'Keep this value to 500 characters or fewer.');
      } else {
        issue.attributes.action[col.name] = raw;
      }
    }
  }
}

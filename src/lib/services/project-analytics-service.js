/**
 * Real analytics for the project view page, aggregated from the project's
 * registered issues: status counts, a monthly status breakdown, a
 * cumulative issue trend and per-attribute issue counts.
 */

import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function monthKey(date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function monthLabel({ year, month }) {
  return `${MONTH_LABELS[month]} ${String(year).slice(-2)}`;
}

function addMonths({ year, month }, count) {
  const date = new Date(Date.UTC(year, month + count, 1));
  return monthKey(date);
}

/** Convert a mongoose Map (or plain object from a lean doc) to a plain object. */
function toPlainObject(map) {
  if (map instanceof Map) return Object.fromEntries(map);
  if (map && typeof map === 'object') return map;
  return {};
}

/** True when the issue has at least one requirement-level link attached. */
function hasLinks(issue) {
  return (issue.recommendations ?? []).some((rec) =>
    (rec.requirements ?? []).some((req) => (req.linkIds ?? []).length > 0)
  );
}

/** True when the issue has at least one evidence file attached. */
function hasEvidence(issue) {
  return (issue.recommendations ?? []).some((rec) =>
    (rec.requirements ?? []).some((req) => (req.evidence ?? []).length > 0)
  );
}

/**
 * Count issues that actually use each HF attribute (recommendation,
 * requirement, links or evidence). Unknown attribute names count 0.
 */
function hfAttributeCount(name, issues) {
  const key = String(name).trim().toLowerCase();
  if (key === 'recommendation') {
    return issues.filter((issue) => (issue.recommendations ?? []).length > 0).length;
  }
  if (key === 'requirement') {
    return issues.filter((issue) =>
      (issue.recommendations ?? []).some((rec) => (rec.requirements ?? []).length > 0)
    ).length;
  }
  if (key === 'links') return issues.filter(hasLinks).length;
  if (key === 'evidence') return issues.filter(hasEvidence).length;
  return 0;
}

/**
 * Build real analytics for a project from its registered issues: status
 * counts, a monthly status breakdown, a cumulative issue trend and
 * per-attribute issue counts.
 * @param {object} project - lean/serialized project document
 */
export async function getProjectAnalytics(project) {
  await connectToDatabase();

  const issues = await Issue.find({ project: project._id })
    .sort({ createdAt: 1 })
    .select(
      'status createdAt riskAttributeValues actionAttributeValues ' +
        'recommendations.requirements.linkIds recommendations.requirements.evidence'
    )
    .lean();

  // Status counts from the real issues.
  const statusCounts = { open: 0, closed: 0, transferred: 0, total: issues.length };
  for (const issue of issues) {
    statusCounts[issue.status] = (statusCounts[issue.status] ?? 0) + 1;
  }

  // Monthly breakdown from the first reported issue to the current month.
  const monthlyBreakdown = [];
  const trend = [];
  const firstReportedAt = issues.length ? issues[0].createdAt : null;

  if (firstReportedAt) {
    const byMonth = new Map();
    for (const issue of issues) {
      const label = monthLabel(monthKey(new Date(issue.createdAt)));
      const entry =
        byMonth.get(label) ?? { month: label, open: 0, closed: 0, transferred: 0 };
      entry[issue.status] += 1;
      byMonth.set(label, entry);
    }

    let total = 0;
    const now = monthKey(new Date());
    for (let key = monthKey(new Date(firstReportedAt)); ; key = addMonths(key, 1)) {
      const month = monthLabel(key);
      const entry =
        byMonth.get(month) ?? { month, open: 0, closed: 0, transferred: 0 };
      monthlyBreakdown.push(entry);
      total += entry.open + entry.closed + entry.transferred;
      trend.push({ month, total });
      if (key.year === now.year && key.month === now.month) break;
    }
  }

  // Real issue counts for each attribute selected in the project.
  const attributeGroups = [
    {
      group: 'Attributes Type (HF)',
      attributes: project.hfAttributes ?? [],
      count: (name) => hfAttributeCount(name, issues),
    },
    {
      group: 'Attributes Type (Risk Assessment)',
      attributes: project.riskAttributes ?? [],
      count: (name) =>
        issues.filter((issue) => {
          const values = toPlainObject(issue.riskAttributeValues);
          return Number(values[name] ?? 0) > 0;
        }).length,
    },
    {
      group: 'Action Attributes',
      attributes: project.actionAttributes ?? [],
      count: (name) =>
        issues.filter((issue) => {
          const values = toPlainObject(issue.actionAttributeValues);
          const value = values[name];
          return typeof value === 'string' ? value.trim().length > 0 : value != null;
        }).length,
    },
  ];
  const attributeCounts = attributeGroups
    .filter((entry) => entry.attributes.length > 0)
    .map((entry) => ({
      group: entry.group,
      counts: entry.attributes.map((name) => ({
        name,
        count: entry.count(name),
      })),
    }));

  return {
    statusCounts,
    monthlyBreakdown,
    trend,
    attributeCounts,
    firstReportedAt: firstReportedAt ? new Date(firstReportedAt).toISOString() : null,
  };
}

/**
 * Real analytics for the project view page, computed inside MongoDB with a
 * single aggregation: status counts, a monthly status breakdown, a cumulative
 * issue trend and per-attribute issue counts. Only counts travel over the
 * wire, so the cost no longer grows with the size of each issue.
 */

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUSES = ['open', 'closed', 'transferred'];

function monthKey(date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function monthLabel({ year, month }) {
  return `${MONTH_LABELS[month]} ${String(year).slice(-2)}`;
}

function addMonths({ year, month }, count) {
  return monthKey(new Date(Date.UTC(year, month + count, 1)));
}

/** Sum of `size(inner)` over every recommendation's requirements, per field. */
function sumNested(outerField, innerField, leafField) {
  return {
    $reduce: {
      input: { $ifNull: [outerField, []] },
      initialValue: 0,
      in: {
        $add: [
          '$$value',
          {
            $reduce: {
              input: { $ifNull: [`$$this.${innerField}`, []] },
              initialValue: 0,
              in: { $add: ['$$value', { $size: { $ifNull: [`$$this.${leafField}`, []] } }] },
            },
          },
        ],
      },
    },
  };
}

/**
 * Expression: true when an attribute map (`mapField`, a document keyed by
 * attribute name) holds a value for `name` that counts as "in use".
 * `mode` is 'risk' (numeric > 0) or 'action' (non-empty text, or any other
 * non-null value).
 */
function attributeInUse(mapField, name, mode) {
  const matches = {
    $filter: {
      input: { $objectToArray: { $ifNull: [mapField, {}] } },
      as: 'e',
      cond: { $eq: ['$$e.k', name] },
    },
  };
  const value = { $arrayElemAt: ['$$kv.v', 0] };
  const check =
    mode === 'flag'
      ? { $eq: ['$$v', true] }
      : mode === 'risk'
      ? { $gt: [{ $convert: { input: '$$v', to: 'double', onError: 0, onNull: 0 } }, 0] }
      : {
          $cond: [
            { $eq: [{ $type: '$$v' }, 'string'] },
            { $gt: [{ $strLenCP: { $trim: { input: '$$v' } } }, 0] },
            { $ne: ['$$v', null] },
          ],
        };
  return {
    $let: {
      vars: { kv: matches },
      in: {
        $cond: [
          { $eq: [{ $size: '$$kv' }, 0] },
          false,
          { $let: { vars: { v: value }, in: check } },
        ],
      },
    },
  };
}

/**
 * Build the per-issue flags used by the grouping stage. Attribute flags are
 * named r<i> (risk) and a<i> (action) so their order matches the project.
 */
function buildProjectStage(project) {
  const stage = {
    status: 1,
    createdAt: 1,
    recCount: { $size: { $ifNull: ['$recommendations', []] } },
    reqCount: {
      $reduce: {
        input: { $ifNull: ['$recommendations', []] },
        initialValue: 0,
        in: { $add: ['$$value', { $size: { $ifNull: ['$$this.requirements', []] } }] },
      },
    },
    linkCount: sumNested('$recommendations', 'requirements', 'linkIds'),
    evidenceCount: sumNested('$recommendations', 'requirements', 'evidence'),
  };
  project.hfAttributes?.forEach((name, i) => {
    // Built-in HF attributes are derived in hfCountExpression; custom ones are stored flags.
    if (!hfCountExpression(name)) {
      stage[`h${i}`] = attributeInUse('$hfAttributeValues', name, 'flag');
    }
  });
  project.riskAttributes?.forEach((name, i) => {
    stage[`r${i}`] = attributeInUse('$riskAttributeValues', name, 'risk');
  });
  project.actionAttributes?.forEach((name, i) => {
    stage[`a${i}`] = attributeInUse('$actionAttributeValues', name, 'action');
  });
  return stage;
}

/**
 * Counts for HF attributes, derived from the flags above. Unknown names
 * count 0, matching the previous behaviour.
 */
function hfCountExpression(name) {
  switch (String(name).trim().toLowerCase()) {
    case 'recommendation':
      return { $gt: ['$recCount', 0] };
    case 'requirement':
      return { $gt: ['$reqCount', 0] };
    case 'links':
      return { $gt: ['$linkCount', 0] };
    case 'evidence':
      return { $gt: ['$evidenceCount', 0] };
    default:
      return null;
  }
}

/** Build the facet group stage that sums every count in one pass. */
function buildSummaryGroup(project) {
  const group = {
    _id: null,
    total: { $sum: 1 },
    firstReportedAt: { $min: '$createdAt' },
  };
  for (const status of STATUSES) {
    group[status] = { $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } };
  }
  (project.hfAttributes ?? []).forEach((name, i) => {
    const expr = hfCountExpression(name);
    group[`h${i}`] = expr
      ? { $sum: { $cond: [expr, 1, 0] } }
      : { $sum: { $cond: [`$h${i}`, 1, 0] } };
  });
  (project.riskAttributes ?? []).forEach((_, i) => {
    group[`r${i}`] = { $sum: { $cond: [`$r${i}`, 1, 0] } };
  });
  (project.actionAttributes ?? []).forEach((_, i) => {
    group[`a${i}`] = { $sum: { $cond: [`$a${i}`, 1, 0] } };
  });
  return group;
}

/** Attribute group definitions in display order (empty groups are dropped). */
function attributeGroups(project) {
  const groups = [
    {
      group: 'Attributes Type (HF)',
      names: project.hfAttributes ?? [],
      key: (i) => `h${i}`,
    },
    {
      group: 'Attributes Type (Risk Assessment)',
      names: project.riskAttributes ?? [],
      key: (i) => `r${i}`,
    },
    {
      group: 'Action Attributes',
      names: project.actionAttributes ?? [],
      key: (i) => `a${i}`,
    },
  ];
  return groups.filter((g) => g.names.length > 0);
}

/**
 * Build real analytics for a project: status counts, a monthly status
 * breakdown, a cumulative issue trend and per-attribute issue counts.
 * @param {object} project - lean/serialized project document
 */
export async function getProjectAnalytics(project) {
  await connectToDatabase();
  const projectId = new mongoose.Types.ObjectId(String(project._id));

  const [result] = await Issue.aggregate([
    { $match: { project: projectId } },
    { $project: buildProjectStage(project) },
    {
      $facet: {
        summary: [{ $group: buildSummaryGroup(project) }],
        monthly: [
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                status: '$status',
              },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const summary = result?.summary?.[0] ?? { total: 0 };
  const statusCounts = {
    open: summary.open ?? 0,
    closed: summary.closed ?? 0,
    transferred: summary.transferred ?? 0,
    total: summary.total ?? 0,
  };

  // Monthly breakdown from the first reported issue to the current month.
  const monthlyBreakdown = [];
  const trend = [];
  const firstReportedAt = summary.firstReportedAt ?? null;

  if (firstReportedAt) {
    const byMonth = new Map();
    for (const row of result.monthly) {
      const label = monthLabel({ year: row._id.year, month: row._id.month - 1 });
      const entry = byMonth.get(label) ?? { month: label, open: 0, closed: 0, transferred: 0 };
      if (STATUSES.includes(row._id.status)) entry[row._id.status] += row.count;
      byMonth.set(label, entry);
    }

    let total = 0;
    const now = monthKey(new Date());
    for (let key = monthKey(new Date(firstReportedAt)); ; key = addMonths(key, 1)) {
      const month = monthLabel(key);
      const entry = byMonth.get(month) ?? { month, open: 0, closed: 0, transferred: 0 };
      monthlyBreakdown.push(entry);
      total += entry.open + entry.closed + entry.transferred;
      trend.push({ month, total });
      if (key.year === now.year && key.month === now.month) break;
    }
  }

  const attributeCounts = attributeGroups(project).map(({ group, names, key }) => ({
    group,
    counts: names.map((name, i) => ({
      name,
      count: summary[key(i)] ?? 0,
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

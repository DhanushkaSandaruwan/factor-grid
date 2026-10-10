import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
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

/**
 * Aggregate dashboard statistics across all projects the user can access.
 * Returns project counts (owned/joined), issue totals with status breakdown,
 * recommendation/requirement counts, and a monthly issue volume breakdown.
 * @param {string} clerkUserId
 * @param {object[]} projects - serialized project documents
 * @returns {Promise<object>}
 */
export async function getDashboardStats(clerkUserId, projects) {
  await connectToDatabase();

  const projectIds = projects
    .map((p) => p._id)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (projectIds.length === 0) {
    return {
      projects: { total: 0, owned: 0, joined: 0 },
      issues: { total: 0, open: 0, closed: 0, transferred: 0, recommendations: 0, requirements: 0 },
      monthlyBreakdown: [],
    };
  }

  const objectIds = projectIds.map((id) => new mongoose.Types.ObjectId(id));

  const [issueAgg] = await Issue.aggregate([
    { $match: { project: { $in: objectIds } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        transferred: { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } },
        recommendations: { $sum: { $size: { $ifNull: ['$recommendations', []] } } },
        requirements: {
          $sum: {
            $reduce: {
              input: { $ifNull: ['$recommendations', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $size: { $ifNull: ['$$this.requirements', []] } }] },
            },
          },
        },
      },
    },
  ]);

  const monthlyRows = await Issue.aggregate([
    { $match: { project: { $in: objectIds } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        transferred: { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const byMonth = new Map();
  for (const row of monthlyRows) {
    const label = monthLabel({ year: row._id.year, month: row._id.month - 1 });
    byMonth.set(label, {
      month: label,
      open: row.open,
      closed: row.closed,
      transferred: row.transferred,
    });
  }

  const monthlyBreakdown = [];
  if (monthlyRows.length > 0) {
    const first = monthlyRows[0]._id;
    const now = monthKey(new Date());
    for (
      let key = { year: first.year, month: first.month - 1 };
      ;
      key = addMonths(key, 1)
    ) {
      const label = monthLabel(key);
      monthlyBreakdown.push(
        byMonth.get(label) ?? { month: label, open: 0, closed: 0, transferred: 0 }
      );
      if (key.year === now.year && key.month === now.month) break;
    }
  }

  const ownedCount = projects.filter((p) => p.createdBy === clerkUserId).length;

  return {
    projects: {
      total: projects.length,
      owned: ownedCount,
      joined: projects.length - ownedCount,
    },
    issues: issueAgg ?? {
      total: 0,
      open: 0,
      closed: 0,
      transferred: 0,
      recommendations: 0,
      requirements: 0,
    },
    monthlyBreakdown,
  };
}

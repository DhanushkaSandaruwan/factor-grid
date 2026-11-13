import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Issue } from '@/models/issue';

/** Numeric value of one risk attribute on an issue (0 when unset). */
function riskValueExpression(name) {
  return {
    $let: {
      vars: {
        kv: {
          $filter: {
            input: { $objectToArray: { $ifNull: ['$riskAttributeValues', {}] } },
            as: 'e',
            cond: { $eq: ['$$e.k', name] },
          },
        },
      },
      in: {
        $cond: [
          { $eq: [{ $size: '$$kv' }, 0] },
          0,
          { $convert: { input: { $arrayElemAt: ['$$kv.v', 0] }, to: 'double', onError: 0, onNull: 0 } },
        ],
      },
    },
  };
}

/**
 * Count issues for every pair of values of two risk attributes (a heatmap).
 * Both attributes must be risk attributes of the project.
 *
 * @param {{ _id: unknown, riskAttributes?: string[] }} project
 * @param {string} xName - attribute shown across the columns
 * @param {string} yName - attribute shown down the rows
 * @returns {Promise<{ error?: string, xName?: string, yName?: string, xValues?: number[], yValues?: number[], cells?: {x: number, y: number, count: number}[], total?: number }>}
 */
export async function getRiskMatrix(project, xName, yName) {
  const names = project.riskAttributes ?? [];
  if (!names.includes(xName) || !names.includes(yName) || xName === yName) {
    return { error: 'Choose two different risk attributes of this project.' };
  }

  await connectToDatabase();
  const rows = await Issue.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(String(project._id)) } },
    { $project: { x: riskValueExpression(xName), y: riskValueExpression(yName) } },
    { $group: { _id: { x: '$x', y: '$y' }, count: { $sum: 1 } } },
  ]);

  const cells = rows.map((row) => ({ x: row._id.x, y: row._id.y, count: row.count }));
  const xValues = [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b);
  const yValues = [...new Set(cells.map((c) => c.y))].sort((a, b) => a - b);
  const total = cells.reduce((sum, c) => sum + c.count, 0);

  return { xName, yName, xValues, yValues, cells, total };
}

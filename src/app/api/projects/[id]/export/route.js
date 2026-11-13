import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { getIssuesByProject } from '@/lib/services/issue-service';
import { getLinksByProject } from '@/lib/services/link-service';
import { recordAudit } from '@/lib/services/audit-service';
import { buildRegistryCsv } from '@/lib/export-csv';
import { buildContentDisposition } from '@/lib/services/storage-service';

/** Project title made safe for a file name; spaces and Unicode are kept. */
function fileNamePart(title) {
  return (
    String(title)
      .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'Project'
  );
}

/** Local date and time stamp for file names, e.g. 2026-11-13_14-05-09. */
function timeStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/**
 * GET /api/projects/[id]/export
 * Download the project's registry as a CSV file, named <project>-Registry-<date-time>.csv.
 * Any member may export; the export itself is recorded in the activity log.
 */
export async function GET(_request, { params }) {
  const { userId } = await auth();
  const { id } = await params;

  const { project, response } = await guardProject(userId, id);
  if (response) return response;

  const [issues, links] = await Promise.all([getIssuesByProject(id), getLinksByProject(id)]);
  const csv = buildRegistryCsv({ project, issues, links });

  await recordAudit({
    projectId: id,
    actor: userId,
    action: 'project.exported',
    summary: `Exported the registry (${issues.length} issues) as CSV`,
  });

  const fileName = `${fileNamePart(project.title)}-Registry-${timeStamp(new Date())}.csv`;
  return new NextResponse(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': buildContentDisposition(fileName, 'attachment'),
      'Cache-Control': 'no-store',
    },
  });
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { templateRows } from '@/lib/services/registry-import-service';
import { toCsv } from '@/lib/export-csv';
import { buildXlsx } from '@/lib/import/write-xlsx';

/**
 * GET — the import template for this project's format, as CSV or Excel
 * (?format=csv|xlsx). Column names include the project's own attributes.
 */
export async function GET(request, { params }) {
  const { userId } = await auth();
  const { id } = await params;
  const { project, response } = await guardProject(userId, id);
  if (response) return response;

  const format = new URL(request.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  const [header, example] = templateRows(project);
  const safePrefix = String(project.issueIdPrefix).replace(/[^A-Za-z0-9-]/g, '');

  if (format === 'xlsx') {
    const buffer = await buildXlsx([header, example], 'Issues');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safePrefix}-registry-template.xlsx"`,
      },
    });
  }
  return new NextResponse(`﻿${toCsv({ header, rows: [example] })}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safePrefix}-registry-template.csv"`,
    },
  });
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { guardProject } from '@/lib/api-guards';
import { getUploadFile } from '@/lib/services/registry-import-service';
import { recordAudit } from '@/lib/services/audit-service';

/** GET — download the original file of an upload (any member). Downloads are logged. */
export async function GET(_request, { params }) {
  const { userId } = await auth();
  const { id, batchId } = await params;
  const { response } = await guardProject(userId, id);
  if (response) return response;

  const file = await getUploadFile(id, batchId);
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  await recordAudit({
    projectId: id,
    actor: userId,
    action: 'import.downloaded',
    summary: `Downloaded the uploaded file “${file.fileName}”`,
  });
  const safe = file.fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  return new NextResponse(file.buffer, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  });
}

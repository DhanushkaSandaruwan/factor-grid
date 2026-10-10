import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { confirmUpload } from '@/lib/services/media-file-service';

/**
 * POST /api/storage/files/[id]/confirm
 * Verify that a presigned upload actually landed in R2 and activate the file
 * record. Call this after the PUT to the presigned URL succeeds.
 */
export async function POST(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const result = await confirmUpload(userId, id);
    if (!result.ok) {
      if (result.code === 'not_uploaded') {
        return NextResponse.json(
          { error: 'Upload not found in storage. Please upload the file again.' },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ file: result.file });
  } catch (error) {
    console.error('[api/storage/files] failed to confirm upload:', error);
    return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 });
  }
}

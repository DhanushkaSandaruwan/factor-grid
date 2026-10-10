import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createFileDownloadUrl, createFileViewUrl, getFileForUser } from '@/lib/services/media-file-service';

/**
 * GET /api/storage/files/[id]/content?disposition=inline|attachment
 * Redirect to a short-lived presigned R2 URL for the file's bytes.
 *
 * `inline` (default) renders images and video straight in the browser, so an
 * `<img src>` or `<video src>` can point here directly. `attachment` forces a
 * download with the original file name, so an `<a href>` works as-is.
 */
export async function GET(request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const disposition =
    new URL(request.url).searchParams.get('disposition') === 'attachment' ? 'attachment' : 'inline';

  try {
    const file = await getFileForUser(userId, id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const signed =
      disposition === 'attachment' ? await createFileDownloadUrl(file) : await createFileViewUrl(file);

    return NextResponse.redirect(signed.url);
  } catch (error) {
    console.error('[api/storage/files] failed to sign content URL:', error);
    return NextResponse.json({ error: 'Failed to open file' }, { status: 500 });
  }
}

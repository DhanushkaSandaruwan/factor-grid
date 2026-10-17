import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AiApiKey } from '@/models/ai-api-key';

/** DELETE /api/ai/keys/[id] — permanently delete an API key. */
export async function DELETE(_request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await connectToDatabase();
    const result = await AiApiKey.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[api/ai/keys] failed to delete key:', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}

/** PATCH /api/ai/keys/[id] — reset a rate-limited key back to active. */
export async function PATCH(_request, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await connectToDatabase();
    const doc = await AiApiKey.findByIdAndUpdate(
      id,
      { $set: { status: 'active', rateLimitedUntil: null } },
      { new: true }
    );
    if (!doc) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    return NextResponse.json({
      key: {
        id: String(doc._id),
        name: doc.name,
        status: doc.status,
        rateLimitedUntil: doc.rateLimitedUntil,
      },
    });
  } catch (error) {
    console.error('[api/ai/keys] failed to reset key:', error);
    return NextResponse.json({ error: 'Failed to reset API key' }, { status: 500 });
  }
}

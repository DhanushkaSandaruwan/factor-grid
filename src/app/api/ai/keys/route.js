import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AiApiKey } from '@/models/ai-api-key';
import { encryptSecret } from '@/lib/crypto';

/**
 * Serialize a key doc for the client — never includes the plain key.
 * @param {object} doc
 * @returns {object}
 */
function toClientKey(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    provider: doc.provider,
    status: doc.status,
    lastUsedAt: doc.lastUsedAt,
    rateLimitedUntil: doc.rateLimitedUntil,
    createdAt: doc.createdAt,
  };
}

/** GET /api/ai/keys — list all API keys (without key material). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const keys = await AiApiKey.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ keys: keys.map(toClientKey) });
}

/** POST /api/ai/keys — add a new API key (encrypted at rest). */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = String(body?.name ?? '').trim();
  const key = String(body?.key ?? '').trim();
  const provider = String(body?.provider ?? 'groq').trim().toLowerCase();

  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'Name is required (max 100 chars)' }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }
  if (!['groq', 'openai', 'other'].includes(provider)) {
    return NextResponse.json({ error: 'Provider must be groq, openai, or other' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const doc = await AiApiKey.create({
      name,
      provider,
      key: encryptSecret(key),
      status: 'active',
    });
    return NextResponse.json({ key: toClientKey(doc.toObject()) }, { status: 201 });
  } catch (error) {
    console.error('[api/ai/keys] failed to add key:', error);
    return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 });
  }
}

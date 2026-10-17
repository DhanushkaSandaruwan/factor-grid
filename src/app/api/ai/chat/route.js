import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createChatStream } from '@/lib/services/ai-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 8000;

/**
 * Validate the chat request body.
 * @param {unknown} body
 * @returns {{messages: Array<{role: string, content: string}>} | {error: string}}
 */
function parseMessages(body) {
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return { error: `messages must be an array of 1-${MAX_MESSAGES} entries` };
  }
  for (const message of messages) {
    if (
      typeof message?.role !== 'string' ||
      !message.role.trim() ||
      typeof message?.content !== 'string' ||
      !message.content.trim() ||
      message.content.length > MAX_CONTENT_LENGTH
    ) {
      return { error: 'each message needs a role and non-empty content (max 8000 chars)' };
    }
  }
  return { messages: messages.map((m) => ({ role: m.role, content: m.content })) };
}

/** POST /api/ai/chat — stream an AI chat completion as Server-Sent Events. */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { messages, error } = parseMessages(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const stream = createChatStream(messages, userId);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

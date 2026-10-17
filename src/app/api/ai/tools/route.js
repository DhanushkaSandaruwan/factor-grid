import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AiSettings } from '@/models/ai-settings';
import { ALL_TOOLS } from '@/lib/services/ai-tools/registry';

/**
 * Serialize the tool list with enabled state for the client.
 * @param {object} settings
 * @returns {object}
 */
function toClientTools(settings) {
  const enabledTools = {};
  for (const tool of ALL_TOOLS) {
    enabledTools[tool.name] = settings?.enabledTools?.get(tool.name) !== false;
  }
  return {
    tools: ALL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      enabled: enabledTools[t.name],
    })),
  };
}

/** GET /api/ai/tools — list all tools with their enabled state. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  let settings = await AiSettings.findOne().lean();
  if (!settings) {
    await AiSettings.create({});
    settings = await AiSettings.findOne().lean();
  }

  return NextResponse.json(toClientTools(settings));
}

/** PATCH /api/ai/tools — bulk update the enabled state of tools. */
export async function PATCH(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates = body?.updates;
  if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) {
    return NextResponse.json({ error: 'updates must be an object of tool name -> boolean' }, { status: 400 });
  }

  const validNames = new Set(ALL_TOOLS.map((t) => t.name));
  const clean = {};
  for (const [name, enabled] of Object.entries(updates)) {
    if (validNames.has(name) && typeof enabled === 'boolean') {
      clean[name] = enabled;
    }
  }

  await connectToDatabase();
  let settings = await AiSettings.findOne();
  if (!settings) {
    settings = await AiSettings.create({});
  }

  for (const [name, enabled] of Object.entries(clean)) {
    settings.enabledTools.set(name, enabled);
  }
  await settings.save();

  return NextResponse.json(toClientTools(settings));
}

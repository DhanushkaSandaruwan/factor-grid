import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AiSettings } from '@/models/ai-settings';
import { ALL_TOOLS } from '@/lib/services/ai-tools/registry';

const EDITABLE_FIELDS = ['baseUrl', 'model', 'systemPrompt', 'temperature', 'maxTokens'];

/**
 * Validate a PATCH body against editable fields.
 * @param {Record<string, unknown>} body
 * @returns {{data: object} | {error: string}}
 */
function validateSettingsPatch(body) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] === undefined) continue;
    const value = body[field];
    if (field === 'baseUrl' && (typeof value !== 'string' || !value.trim())) {
      return { error: 'baseUrl must be a non-empty string' };
    }
    if (field === 'model' && (typeof value !== 'string' || !value.trim())) {
      return { error: 'model must be a non-empty string' };
    }
    if (field === 'systemPrompt' && typeof value !== 'string') {
      return { error: 'systemPrompt must be a string' };
    }
    if (field === 'temperature' && (typeof value !== 'number' || value < 0 || value > 2)) {
      return { error: 'temperature must be between 0 and 2' };
    }
    if (field === 'maxTokens' && (typeof value !== 'number' || value < 1 || value > 8192)) {
      return { error: 'maxTokens must be between 1 and 8192' };
    }
    data[field] = value;
  }
  return { data };
}

/**
 * Serialize a settings doc for the client — no sensitive material.
 * @param {object} doc
 * @returns {object}
 */
function toClientSettings(doc) {
  const enabledTools = {};
  for (const tool of ALL_TOOLS) {
    enabledTools[tool.name] = doc.enabledTools?.get(tool.name) !== false;
  }
  return {
    baseUrl: doc.baseUrl,
    model: doc.model,
    systemPrompt: doc.systemPrompt,
    temperature: doc.temperature,
    maxTokens: doc.maxTokens,
    enabledTools,
    availableTools: ALL_TOOLS.map((t) => t.name),
  };
}

/** GET /api/ai/settings — fetch the AI settings. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  let settings = await AiSettings.findOne().lean();
  if (!settings) {
    await AiSettings.create({});
    settings = await AiSettings.findOne().lean();
  }

  return NextResponse.json(toClientSettings(settings));
}

/** PATCH /api/ai/settings — update editable AI settings fields. */
export async function PATCH(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data, error } = validateSettingsPatch(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await connectToDatabase();
  let settings = await AiSettings.findOne();
  if (!settings) {
    settings = await AiSettings.create({});
  }

  for (const [key, value] of Object.entries(data)) {
    settings[key] = value;
  }
  await settings.save();

  return NextResponse.json(toClientSettings(settings));
}

import { connectToDatabase } from '@/lib/db';
import { AiApiKey } from '@/models/ai-api-key';
import { AiSettings } from '@/models/ai-settings';
import { decryptSecret } from '@/lib/crypto';
import { getEnabledTools, toProviderTools, executeToolCall } from '@/lib/services/ai-tools/registry';

/**
 * AI companion service: talks to an OpenAI-compatible chat completions API
 * (Groq by default) with automatic API-key rotation and a tool-calling loop.
 * Keys live in MongoDB (encrypted at rest); the GROQ_API_KEYS env var is a
 * bootstrap-only fallback used when the database has no keys yet.
 *
 * Events are emitted as Server-Sent Events strings:
 *   event: token     -> data: {"type":"token","content":"..."}
 *   event: done      -> data: {"type":"done"}
 *   event: error     -> data: {"type":"error","message":"..."}
 *   event: navigate  -> data: {"type":"navigate","path":"..."}
 */

const sseEncoder = new TextEncoder();
const MAX_TOOL_ITERATIONS = 5;

/**
 * Queue one SSE event onto the controller.
 * @param {ReadableStreamDefaultController<Uint8Array>} controller
 * @param {'token'|'done'|'error'|'navigate'} type
 * @param {object} data
 */
function emit(controller, type, data) {
  controller.enqueue(sseEncoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
}

/**
 * Load the singleton AI settings document, seeding defaults on first run.
 * Resets the model if it was left at a retired default.
 * @returns {Promise<{baseUrl: string, model: string, systemPrompt: string, temperature: number, maxTokens: number, enabledTools?: Map}>}
 */
async function getAiSettings() {
  await connectToDatabase();
  let settings = await AiSettings.findOne().lean();
  if (!settings) {
    await AiSettings.create({});
    settings = await AiSettings.findOne().lean();
  }
  if (settings.model === 'llama-3.3-70b-versatile') {
    await AiSettings.findByIdAndUpdate(settings._id, {
      $set: { model: 'openai/gpt-oss-120b' },
    });
    settings.model = 'openai/gpt-oss-120b';
  }
  return settings;
}

/**
 * Mark a database-backed key as rate-limited for `retryAfterSeconds`.
 * @param {string} id
 * @param {number} retryAfterSeconds
 */
async function markKeyRateLimited(id, retryAfterSeconds = 60) {
  await connectToDatabase();
  await AiApiKey.findByIdAndUpdate(id, {
    $set: {
      status: 'rate-limited',
      rateLimitedUntil: new Date(Date.now() + retryAfterSeconds * 1000),
    },
  });
}

/**
 * Stamp last-used time on a database-backed key (LRU rotation).
 * @param {string} id
 */
async function markKeyUsed(id) {
  await connectToDatabase();
  await AiApiKey.findByIdAndUpdate(id, {
    $set: { lastUsedAt: new Date(), status: 'active', rateLimitedUntil: null },
  });
}

/**
 * Resolve the ordered list of usable API keys: active DB keys (least recently
 * used first, expired rate-limit windows reinstated), falling back to the
 * GROQ_API_KEYS env var when the database is empty.
 * @returns {Promise<Array<{id: string|null, name: string, plain: string}>>}
 */
async function resolveApiKeys() {
  await connectToDatabase();
  const docs = await AiApiKey.find().sort({ lastUsedAt: 1 }).lean();

  if (docs.length > 0) {
    const now = new Date();
    const expired = docs.filter(
      (d) => d.status === 'rate-limited' && d.rateLimitedUntil && d.rateLimitedUntil <= now
    );
    if (expired.length > 0) {
      await AiApiKey.updateMany(
        { _id: { $in: expired.map((d) => d._id) } },
        { $set: { status: 'active', rateLimitedUntil: null } }
      );
    }
    return docs
      .filter(
        (d) =>
          d.status === 'active' ||
          (d.rateLimitedUntil && d.rateLimitedUntil <= now)
      )
      .map((d) => ({ id: String(d._id), name: d.name, plain: decryptSecret(d.key) }));
  }

  const envKeys = (process.env.GROQ_API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return envKeys.map((plain, i) => ({ id: null, name: `env-key-${i + 1}`, plain }));
}

/**
 * Pump an OpenAI-format streaming response into normalized SSE token events.
 * Also accumulates tool_calls and finish_reason for the tool-calling loop.
 * @param {Response} response
 * @param {ReadableStreamDefaultController<Uint8Array>} controller
 * @param {{toolCalls: Array<{id: string, index: number, function: {name: string, arguments: string}}>, finishReason: string|null}} state
 */
async function pumpProviderStream(response, controller, state) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const chunk = JSON.parse(payload);
        const choice = chunk.choices?.[0];
        const content = choice?.delta?.content;
        if (content) emit(controller, 'token', { content });

        // Accumulate tool call fragments.
        const toolCallDelta = choice?.delta?.tool_calls;
        if (Array.isArray(toolCallDelta)) {
          for (const tc of toolCallDelta) {
            const idx = tc.index ?? 0;
            if (!state.toolCalls[idx]) {
              state.toolCalls[idx] = {
                id: tc.id ?? `call_${idx}`,
                index: idx,
                function: { name: '', arguments: '' },
              };
            }
            if (tc.id) state.toolCalls[idx].id = tc.id;
            if (tc.function?.name) state.toolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments) {
              state.toolCalls[idx].function.arguments += tc.function.arguments;
            }
          }
        }

        if (choice?.finish_reason) state.finishReason = choice.finish_reason;
      } catch {
        // Ignore malformed provider chunks.
      }
    }
  }
}

/**
 * Create an SSE stream that answers the given chat messages, rotating to the
 * next API key whenever one is rate-limited or out of quota. When tools are
 * enabled, runs the tool-calling loop.
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} userId
 * @returns {ReadableStream<Uint8Array>}
 */
export function createChatStream(messages, userId) {
  return new ReadableStream({
    async start(controller) {
      try {
        await runChatWithTools(messages, userId, controller);
      } catch (error) {
        emit(controller, 'error', { message: friendlyError(error) });
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Run the chat with tool-calling loop. Streams tokens, executes tool calls
 * server-side, and loops until the model returns a final text answer.
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} userId
 * @param {ReadableStreamDefaultController<Uint8Array>} controller
 */
async function runChatWithTools(messages, userId, controller) {
  const settings = await getAiSettings();
  const enabledTools = getEnabledTools(settings);
  const hasTools = enabledTools.length > 0;

  const conversation = [
    { role: 'system', content: settings.systemPrompt },
    ...messages,
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const state = { toolCalls: [], finishReason: null };
    const streamResult = await streamCompletion(
      conversation,
      settings,
      hasTools ? toProviderTools(enabledTools) : undefined,
      controller,
      state
    );

    if (streamResult.error) throw streamResult.error;

    // If the model requested tool calls, execute them and loop.
    if (state.finishReason === 'tool_calls' && state.toolCalls.length > 0) {
      const assistantMessage = {
        role: 'assistant',
        content: null,
        tool_calls: state.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      };
      conversation.push(assistantMessage);

      for (const toolCall of state.toolCalls) {
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          args = {};
        }

        const result = await executeToolCall(toolCall.function.name, args, { userId });

        if (result.navigate) {
          emit(controller, 'navigate', { path: result.navigate });
        }

        conversation.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result.result ?? { ok: false, error: 'No result.' }),
        });
      }
      continue;
    }

    // Final text answer — we're done.
    emit(controller, 'done', {});
    return;
  }

  // Max iterations reached without a final answer.
  emit(controller, 'done', {});
}

/**
 * Stream a single completion attempt against the provider, rotating keys on
 * rate limits. Returns an error object on failure.
 * @param {Array} conversation
 * @param {object} settings
 * @param {object[]|undefined} tools
 * @param {ReadableStreamDefaultController<Uint8Array>} controller
 * @param {{toolCalls: Array, finishReason: string|null}} state
 * @returns {Promise<{error: Error|null}>}
 */
async function streamCompletion(conversation, settings, tools, controller, state) {
  const keys = await resolveApiKeys();

  if (keys.length === 0) {
    return {
      error: new Error(
        'No AI API keys configured. Add keys in the AI settings or set the GROQ_API_KEYS environment variable.'
      ),
    };
  }

  let lastError = null;

  for (const key of keys) {
    const body = {
      model: settings.model,
      messages: conversation,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      stream: true,
    };
    if (tools) body.tools = tools;

    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key.plain}`,
      },
      body: JSON.stringify(body),
    });

    // Rotate on rate limits / quota exhaustion (402) — try the next key.
    if (response.status === 429 || response.status === 402) {
      const retryAfter = Number(response.headers.get('retry-after')) || 60;
      if (key.id) await markKeyRateLimited(key.id, retryAfter);
      lastError = new Error(
        `AI API key "${key.name}" is rate-limited or out of quota (HTTP ${response.status}).`
      );
      continue;
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      return {
        error: new Error(
          `AI provider request failed (HTTP ${response.status})${detail ? `: ${detail}` : ''}`
        ),
      };
    }

    if (key.id) await markKeyUsed(key.id);
    await pumpProviderStream(response, controller, state);
    return { error: null };
  }

  return { error: lastError ?? new Error('All AI API keys failed.') };
}

/**
 * Map an unknown error to a user-safe message.
 * @param {unknown} error
 * @returns {string}
 */
function friendlyError(error) {
  if (error instanceof Error && error.message) return error.message;
  return 'The AI assistant failed to respond. Please try again.';
}

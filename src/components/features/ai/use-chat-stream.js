'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Chat streaming hook for the AI assistant. Keeps the message list, sends
 * user messages to /api/ai/chat, and appends streamed SSE token events to
 * the pending assistant reply. Handles navigate events via router.push.
 *
 * @returns {{messages: Array, isStreaming: boolean, send: (text: string) => Promise<void>}}
 */
export function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const router = useRouter();

  /**
   * Send a user message and stream the assistant reply.
   * @param {string} text
   */
  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: trimmed },
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setIsStreaming(true);

    const history = [...messages, { role: 'user', content: trimmed }];

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (HTTP ${response.status})`);
      }

      await readSseStream(response.body, assistantId, (event) => {
        if (event.type === 'token') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.content } : m
            )
          );
        } else if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: event.message } : m))
          );
        } else if (event.type === 'navigate') {
          router.push(event.path);
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The AI assistant failed to respond.';
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: message } : m))
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return { messages, isStreaming, send };
}

/**
 * Read an SSE stream block by block, invoking `onEvent` for each parsed event.
 * @param {ReadableStream<Uint8Array>} body
 * @param {string} assistantId
 * @param {(event: {type: string, content?: string, message?: string, path?: string}) => void} onEvent
 */
async function readSseStream(body, assistantId, onEvent) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseSseBlock(block);
      if (event) onEvent(event);
    }
  }
}

/**
 * Parse one "event: …\ndata: …" block.
 * @param {string} block
 * @returns {{type: string, content?: string, message?: string, path?: string} | null}
 */
function parseSseBlock(block) {
  const eventLine = block.split('\n').find((l) => l.startsWith('event:'));
  const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
  if (!eventLine || !dataLine) return null;

  const type = eventLine.slice(6).trim();
  let data;
  try {
    data = JSON.parse(dataLine.slice(5).trim());
  } catch {
    return null;
  }

  if (type === 'token') return { type, content: data.content ?? '' };
  if (type === 'error') return { type, message: data.message ?? 'Unknown error' };
  if (type === 'navigate') return { type, path: data.path ?? '' };
  return { type };
}


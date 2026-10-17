'use client';

import { useState } from 'react';
import { AiFab } from './ai-fab';
import { ChatPanel } from './chat-panel';
import { useChatStream } from './use-chat-stream';

/**
 * AI companion entry point: floating button + chat panel with streaming.
 * Mounted once in the authenticated app shell so it is available on every
 * app page.
 */
export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const { messages, isStreaming, send } = useChatStream();

  return (
    <>
      <ChatPanel
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        isStreaming={isStreaming}
        onSend={send}
      />
      <AiFab open={open} onToggle={() => setOpen((prev) => !prev)} />
    </>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

const SUGGESTIONS = [
  'What can you help me with?',
  'How do I create a project?',
  'Explain the issue registry',
];

/**
 * Fixed chat panel: header, scrollable message list with an empty-state
 * suggestion list, and the streaming composer.
 */
export function ChatPanel({ open, onClose, messages, isStreaming, onSend }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  if (!open) return null;

  return (
    <section
      aria-label="AI assistant chat"
      className={cn(
        'bg-card fixed right-4 bottom-24 z-50 flex w-[24rem] max-w-[calc(100vw-2rem)]',
        'flex-col overflow-hidden rounded-xl border border-border shadow-enterprise',
        'ring-1 ring-foreground/10',
        'h-[32rem] max-h-[calc(100dvh-8rem)]',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
      )}
      data-state={open ? 'open' : 'closed'}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">AI Assistant</p>
          <p className="text-muted-foreground truncate text-xs">Powered by Aqord</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI assistant"
          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        >
          <X />
        </button>
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground text-sm">
              Ask me anything about your work in FactorGrid.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSend(suggestion)}
                  className="bg-muted hover:bg-muted/70 text-foreground rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}
      </div>

      <ChatInput disabled={isStreaming} onSend={onSend} />
    </section>
  );
}

'use client';

import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

/**
 * Chat composer: auto-growing textarea with Enter-to-send and a primary
 * send button. Disabled while a response streams.
 */
export function ChatInput({ disabled, onSend }) {
  const [value, setValue] = useState('');

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask the AI assistant…"
          rows={1}
          disabled={disabled}
          aria-label="Message the AI assistant"
          className="max-h-32 min-h-[40px] flex-1 resize-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={cn(buttonVariants({ variant: 'default', size: 'icon' }))}
        >
          <ArrowUp />
        </button>
      </div>
    </div>
  );
}

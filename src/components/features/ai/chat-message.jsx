import { cn } from 'cn';

/**
 * A single chat message bubble — right-aligned primary for the user,
 * left-aligned muted for the assistant.
 */
export function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        {message.content || (
          <span className="text-muted-foreground animate-pulse">Thinking…</span>
        )}
      </div>
    </div>
  );
}

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';

/**
 * Styled native select. Keeps native keyboard and mobile behaviour while
 * matching the Input surface, border and focus ring.
 * @param {React.SelectHTMLAttributes<HTMLSelectElement> & { size?: 'default' | 'sm', wrapperClassName?: string }} props
 */
function Select({ className, wrapperClassName, size = 'default', children, ...props }) {
  return (
    <div className={cn('relative inline-flex min-w-0', wrapperClassName)}>
      <select
        data-slot="select"
        className={cn(
          'bg-card text-foreground border-input shadow-soft hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-ring/25 w-full min-w-0 cursor-pointer appearance-none rounded-lg border pr-7 pl-2.5 transition-[border-color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60',
          size === 'sm' ? 'h-7 text-xs' : 'h-8 text-[0.8125rem]',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2"
      />
    </div>
  );
}

export { Select };

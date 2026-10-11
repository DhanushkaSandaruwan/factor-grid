import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

/**
 * Full-page loading state rendered by Next.js `loading.jsx` boundaries
 * while a route's data loads and the page finishes rendering.
 * @param {{ label?: string, className?: string }} props
 */
export function LoadingScreen({ label = 'Loading', className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
      <img src="/logo-mark.svg" alt="" className="size-10 rounded-xl" />
      <Spinner className="size-8 text-primary" />
      <p className="text-muted-foreground text-sm font-medium">{label}…</p>
    </div>
  );
}

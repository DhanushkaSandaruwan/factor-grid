import { cn } from '@/lib/utils';

/**
 * Full-page loading state rendered by Next.js `loading.jsx` boundaries
 * while a route's data loads. A calm brand mark with a slim progress track.
 * @param {{ label?: string, className?: string }} props
 */
export function LoadingScreen({ label = 'Loading', className }) {
  return (
    <div
      className={cn('app-canvas flex flex-col items-center justify-center gap-5', className)}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <span className="bg-primary/20 absolute inset-0 animate-ping rounded-xl [animation-duration:2.4s]" />
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/logo-mark.svg" alt="" className="relative size-12 rounded-xl shadow-enterprise" />
      </div>
      <div className="bg-border h-0.5 w-40 overflow-hidden rounded-full">
        <div className="bg-primary h-full w-1/2 animate-pulse rounded-full" />
      </div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide">{label}…</p>
    </div>
  );
}

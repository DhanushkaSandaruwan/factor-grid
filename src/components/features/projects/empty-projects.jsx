import Link from 'next/link';
import { FolderPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

/** Decorative node-grid illustration built from the FactorGrid brand mark. */
function NodeGridArt() {
  return (
    <svg viewBox="0 0 220 140" className="h-auto w-full max-w-[220px]" aria-hidden="true">
      <defs>
        <pattern id="fg-empty-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-muted-foreground/25" />
        </pattern>
        <linearGradient id="fg-empty-link" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: 'var(--primary)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--chart-2)' }} />
        </linearGradient>
      </defs>
      <rect width="220" height="140" rx="16" fill="url(#fg-empty-grid)" />
      <path
        d="M52 92 L110 52 M110 52 L168 84 M110 52 L128 112 M52 92 L128 112"
        stroke="url(#fg-empty-link)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <circle cx="52" cy="92" r="8" className="fill-primary" opacity="0.9" />
      <circle cx="110" cy="52" r="6" className="fill-chart-2" />
      <circle cx="168" cy="84" r="5" className="fill-muted-foreground" opacity="0.6" />
      <circle cx="128" cy="112" r="5" className="fill-chart-2" opacity="0.8" />
    </svg>
  );
}

/** Empty-state prompt shown on the dashboard when the user has no projects. */
export function EmptyProjects() {
  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center p-6">
      <div className="bg-card ring-foreground/[0.07] shadow-enterprise flex w-full max-w-md flex-col items-center gap-5 rounded-2xl p-8 text-center ring-1">
        <NodeGridArt />
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">No projects yet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Create your first project to start tracking human factors issues, attributes and packages.
          </p>
        </div>
        <Link href="/projects/new" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          <FolderPlus data-icon="inline-start" />
          Create your first project
        </Link>
      </div>
    </div>
  );
}

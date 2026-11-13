'use client';

import Link from 'next/link';
import { FolderPlus, Settings } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { buttonVariants } from '@/components/ui/button';
import { InvitationsMenu } from '@/components/features/notifications/invitations-menu';
import { SearchBox } from '@/components/features/search/search-box';

/**
 * Global top bar for authenticated app pages (excludes auth and onboarding).
 * Left: brand · Centre: search · Right: primary action, utilities and account.
 */
export function TopBar({ companyName }) {
  return (
    <header className="surface-glass border-border/70 relative z-40 flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <Link
        href="/dashboard"
        className="focus-ring flex min-w-0 items-center gap-2.5 rounded-lg"
        aria-label="Go to dashboard"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/logo-mark.svg" alt="" className="size-7 shrink-0 rounded-lg shadow-soft" />
        <span className="text-foreground truncate text-sm font-semibold tracking-tight">
          {companyName}
        </span>
      </Link>

      <div className="mx-auto hidden md:block">
        <SearchBox />
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <Link
          href="/projects/new"
          className={buttonVariants({ size: 'sm', className: 'mr-1.5 shadow-soft' })}
        >
          <FolderPlus data-icon="inline-start" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Link>
        <Link
          href="/settings"
          aria-label="AI Settings"
          title="AI Settings"
          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        >
          <Settings />
        </Link>
        <InvitationsMenu />
        <span className="bg-border mx-1.5 hidden h-5 w-px sm:block" aria-hidden="true" />
        <UserButton />
      </div>
    </header>
  );
}

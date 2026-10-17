'use client';

import Link from 'next/link';
import { FolderPlus, Settings } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { buttonVariants } from '@/components/ui/button';
import { InvitationsMenu } from '@/components/features/notifications/invitations-menu';
import { SearchBox } from '@/components/features/search/search-box';

/**
 * Global top bar for authenticated app pages (excludes auth and onboarding).
 * Left: company name · Center: search · Right: new project action + signed-in
 * user controls.
 */
export function TopBar({ companyName }) {
  return (
    <header className="bg-card border-b flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
      <Link
        href="/dashboard"
        className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Go to dashboard"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/logo-mark.svg" alt="Factor Grid" className="size-7 shrink-0 rounded-lg" />
        <span className="text-foreground truncate text-sm font-semibold tracking-tight">
          {companyName}
        </span>
      </Link>

      <div className="mx-auto hidden md:block">
        <SearchBox />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Link
          href="/projects/new"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <FolderPlus data-icon="inline-start" />
          New Project
        </Link>
        <Link
          href="/settings"
          aria-label="AI Settings"
          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
        >
          <Settings />
        </Link>
        <InvitationsMenu />
        <UserButton />
      </div>
    </header>
  );
}

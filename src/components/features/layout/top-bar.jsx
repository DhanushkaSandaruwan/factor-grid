'use client';

import Link from 'next/link';
import { FolderPlus, Search } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { Input } from '@/components/ui/input';
import { buttonVariants } from '@/components/ui/button';
import { InvitationsMenu } from '@/components/features/notifications/invitations-menu';

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

      <div className="mx-auto hidden w-full max-w-md md:block">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search…"
            aria-label="Search"
            className="pl-8"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Link
          href="/projects/new"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <FolderPlus data-icon="inline-start" />
          New Project
        </Link>
        <InvitationsMenu />
        <UserButton />
      </div>
    </header>
  );
}

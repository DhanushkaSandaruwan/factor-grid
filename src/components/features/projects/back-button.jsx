'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Page-level back button. Returns to the previous screen via browser
 * history, falling back to the given href when there is no history
 * (e.g. the page was opened directly).
 * @param {{ fallbackHref: string, label?: string }} props
 */
export function BackButton({ fallbackHref, label = 'Back' }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    >
      <ArrowLeft data-icon="inline-start" />
      {label}
    </Button>
  );
}

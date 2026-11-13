'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Opens the browser print dialog (choose "Save as PDF" to export). */
export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer data-icon="inline-start" />
      Print / Save as PDF
    </Button>
  );
}

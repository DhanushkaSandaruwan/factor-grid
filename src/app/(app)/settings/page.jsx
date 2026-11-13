import Link from 'next/link';
import { SettingsClient } from '@/components/features/ai/settings/settings-client';
import { buttonVariants } from '@/components/ui/button';

export const metadata = {
  title: 'AI Settings',
};

/** AI Settings page — manage API keys, model config, system prompt, and tools. */
export default function SettingsPage() {
  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="mb-4 flex justify-end">
          <Link href="/settings/attributes" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Attribute lists
          </Link>
        </div>
        <SettingsClient />
      </div>
    </div>
  );
}

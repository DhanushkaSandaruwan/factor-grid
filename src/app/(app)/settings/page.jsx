import { SettingsClient } from '@/components/features/ai/settings/settings-client';

export const metadata = {
  title: 'AI Settings',
};

/** AI Settings page — manage API keys, model config, system prompt, and tools. */
export default function SettingsPage() {
  return (
    <div className="scrollbar-refined h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl p-6">
        <SettingsClient />
      </div>
    </div>
  );
}

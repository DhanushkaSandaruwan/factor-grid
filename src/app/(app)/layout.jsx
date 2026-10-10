import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, isProfileComplete } from '@/lib/services/user-profile-service';
import { TopBar } from '@/components/features/layout/top-bar';

/**
 * Shell for authenticated app pages: guards auth + onboarding state and
 * renders the global top bar. Auth and onboarding pages live outside this
 * route group and are excluded from the top bar.
 */
export default async function AppLayout({ children }) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const profile = await getUserProfile(userId);
  if (!isProfileComplete(profile)) {
    redirect('/onboarding');
  }

  return (
    <div className="bg-background flex h-svh flex-col overflow-hidden">
      <TopBar companyName={profile.companyName} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

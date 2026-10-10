import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, isProfileComplete } from '@/lib/services/user-profile-service';
import { OnboardingForm } from '@/components/features/onboarding/onboarding-form';

export const metadata = {
  title: 'Onboarding',
};

/** Post-auth onboarding step: collect the user's profile details once. */
export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const profile = await getUserProfile(userId);
  if (isProfileComplete(profile)) {
    redirect('/dashboard');
  }

  return (
    <main className="bg-background flex h-svh items-center justify-center overflow-hidden p-8 sm:p-12">
      <OnboardingForm
        initialData={{
          firstName: profile?.firstName ?? '',
          lastName: profile?.lastName ?? '',
          contactNumber: profile?.contactNumber ?? '',
          companyName: profile?.companyName ?? '',
        }}
      />
    </main>
  );
}

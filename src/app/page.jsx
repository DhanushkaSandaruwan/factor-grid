import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getUserProfile, isProfileComplete } from '@/lib/services/user-profile-service';

/** Routing hub: send users to sign-in, onboarding, or the dashboard. */
export default async function RootPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const profile = await getUserProfile(userId);
  redirect(isProfileComplete(profile) ? '/dashboard' : '/onboarding');
}

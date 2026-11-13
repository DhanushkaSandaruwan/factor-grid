import { SignIn } from '@clerk/nextjs';
import { AUTH_APPEARANCE } from '@/components/features/auth/auth-appearance';

export const metadata = {
  title: 'Sign in',
};

/** Sign-in page — Clerk form on the calm brand canvas. */
export default function SignInPage() {
  return (
    <main className="app-canvas flex h-svh items-center justify-center overflow-hidden p-6">
      <SignIn fallbackRedirectUrl="/" appearance={AUTH_APPEARANCE} />
    </main>
  );
}

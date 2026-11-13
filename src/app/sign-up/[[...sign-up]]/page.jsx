import { SignUp } from '@clerk/nextjs';
import { AUTH_APPEARANCE } from '@/components/features/auth/auth-appearance';

export const metadata = {
  title: 'Sign up',
};

/** Sign-up page — Clerk form on the calm brand canvas. */
export default function SignUpPage() {
  return (
    <main className="app-canvas flex h-svh items-center justify-center overflow-hidden p-6">
      <SignUp fallbackRedirectUrl="/" appearance={AUTH_APPEARANCE} />
    </main>
  );
}

import { SignIn } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <main className="bg-background flex h-svh items-center justify-center overflow-hidden p-6">
      <SignIn fallbackRedirectUrl="/" />
    </main>
  );
}

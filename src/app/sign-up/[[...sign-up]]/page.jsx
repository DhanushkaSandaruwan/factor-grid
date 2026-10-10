import { SignUp } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign up',
};

export default function SignUpPage() {
  return (
    <main className="bg-background flex h-svh items-center justify-center overflow-hidden p-6">
      <SignUp fallbackRedirectUrl="/" />
    </main>
  );
}

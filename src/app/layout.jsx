import { ClerkProvider } from '@clerk/nextjs';
import '@/styles/globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: {
    default: 'Factor Grid | Human Factors Intelligence',
    template: '%s | Factor Grid',
  },
  description: 'Enterprise analytics for human factors issue reporting and risk governance.',
  keywords: ['human factors', 'issue reporting', 'risk assessment', 'enterprise analytics'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="bg-background text-foreground antialiased">
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

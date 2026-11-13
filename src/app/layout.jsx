import { ClerkProvider } from '@clerk/nextjs';
import '@/styles/globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

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
    { media: '(prefers-color-scheme: light)', color: '#f5f7fb' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn('font-sans', geistSans.variable, geistMono.variable)}
    >
      <body className="bg-background text-foreground antialiased">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}

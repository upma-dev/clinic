import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import FloatingSidebar from '@/components/ui/FloatingSidebar';
import { GlobalNavigationLoaderProvider } from '@/components/providers/GlobalNavigationLoader';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Skin Hub | Dr. Prateek Tiwari - Dermatology Clinic, Ujjain',
  description: 'Premium medical-grade dermatology clinic in Freeganj, Ujjain led by Dr. Prateek Tiwari (MBBS, DVD). Specialising in Acne, PRP Hair Therapy, skin whitening & anti-ageing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <head>
        <link rel="icon" href="/assets/logo.png" />
      </head>
      <body className="antialiased selection:bg-accent/30 selection:text-text bg-surface text-text">
        <Suspense fallback={null}>
          <GlobalNavigationLoaderProvider>
            <FloatingSidebar />
            {children}
          </GlobalNavigationLoaderProvider>
        </Suspense>
      </body>
    </html>
  );
}

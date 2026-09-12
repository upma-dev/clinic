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

// Standard Canonical Production SEO Metadata
export const metadata: Metadata = {
  title: 'Skin Hub | Dr. Prateek Tiwari - Dermatology Clinic, Ujjain',
  description:
    'Premium medical-grade dermatology clinic in Freeganj, Ujjain led by Dr. Prateek Tiwari (MBBS, DVD). Specialising in Acne, PRP Hair Therapy, skin whitening & anti-ageing.',
  keywords: [
    'Skin Hub Ujjain',
    'Dr Prateek Tiwari',
    'Dermatologist Ujjain',
    'Skin Specialist Ujjain',
    'Hair Loss Treatment Ujjain',
    'PRP Therapy Ujjain',
    'Acne Treatment Ujjain',
    'Chemical Peel Ujjain',
    'Derma Clinic Freeganj',
  ],
  authors: [{ name: 'Dr. Prateek Tiwari' }],
  metadataBase: new URL('https://skinhubujjain.com'),
  openGraph: {
    title: 'Skin Hub | Dr. Prateek Tiwari - Dermatology Clinic, Ujjain',
    description:
      'Premium medical-grade dermatology clinic in Freeganj, Ujjain led by Dr. Prateek Tiwari (MBBS, DVD). Specialising in Acne, PRP Hair Therapy, skin whitening & anti-ageing.',
    url: 'https://skinhubujjain.com',
    siteName: "Dr. Prateek Tiwari's Skin Hub Clinic",
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: 'Skin Hub Dermatology & Hair Clinic Ujjain',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skin Hub | Dr. Prateek Tiwari - Dermatology Clinic, Ujjain',
    description:
      'Premium medical-grade dermatology clinic in Freeganj, Ujjain led by Dr. Prateek Tiwari (MBBS, DVD).',
    images: ['/assets/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Google Search MedicalClinic Schema.org JSON-LD Rich Snippet
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: "Dr. Prateek Tiwari's Skin Hub Derma, Hair & Laser Clinic",
    image: 'https://skinhubujjain.com/assets/logo.png',
    logo: 'https://skinhubujjain.com/assets/logo.png',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'B-23, Bada Shopping Complex, Opposite Water Tank, Rishi Nagar',
      addressLocality: 'Ujjain',
      addressRegion: 'Madhya Pradesh',
      postalCode: '456010',
      addressCountry: 'IN',
    },
    telephone: '+91 98270 42111',
    email: 'contact@skinhubujjain.com',
    priceRange: '₹200 - ₹1000',
    medicalSpecialty: 'Dermatology',
    physician: {
      '@type': 'Physician',
      name: 'Dr. Prateek Tiwari',
      medicalSpecialty: 'Dermatologist',
      qualifications: 'MBBS, DVD',
    },
  };

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <head>
        <link rel="icon" href="/assets/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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

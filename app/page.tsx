/**
 * @file app/page.tsx
 * ✅ FIX: Removed 'use client' — page is now a Server Component.
 * Only leaf components that need interactivity are marked 'use client'.
 * This restores SSR benefits and improves SEO crawlability.
 */

import React from 'react';
import Navbar from '@/components/sections/Navbar';
import Hero from '@/components/sections/Hero';
import dynamic from 'next/dynamic';
import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';

const Services = dynamic(() => import('@/components/sections/Services'));
const BookingForm = dynamic(() => import('@/components/sections/BookingForm'));
const About = dynamic(() => import('@/components/sections/About'));
const Certificates = dynamic(() => import('@/components/sections/Certificates'));
const BeforeAfter = dynamic(() => import('@/components/sections/BeforeAfter'));
const VideoSection = dynamic(() => import('@/components/sections/VideoSection'));
const Testimonials = dynamic(() => import('@/components/sections/Testimonials'));
const BlogSection = dynamic(() => import('@/components/sections/Blog'));
const Gallery = dynamic(() => import('@/components/sections/Gallery'));
const PatientPortal = dynamic(() => import('@/components/sections/PatientPortal'));
const HowToUse = dynamic(() => import('@/components/sections/HowToUse'));
const Contact = dynamic(() => import('@/components/sections/Contact'));
const Footer = dynamic(() => import('@/components/sections/Footer'));

export default async function Home() {
  const settings = await getClinicSettings();
  const cms = await getCmsSettings();

  return (
    <main className="min-h-screen bg-surface selection:bg-accent/30 selection:text-text">
      
      {/* Dynamic top banner alert */}
      {cms.bannerEnabled && cms.bannerText && (
        <div className="bg-gradient-to-r from-primary to-accent text-white py-2.5 px-4 text-center text-xs font-bold font-sans tracking-wide z-50 relative animate-pulse">
          <a href={cms.bannerLink || '/#bookings'}>{cms.bannerText}</a>
        </div>
      )}

      <Navbar settings={settings} cms={cms} />

      {/* 1. Hero — first impression + SEO H1 */}
      <Hero settings={settings} cms={cms} />

      {/* 2. Interactive OPD & Consultation Booking Form */}
      <BookingForm />

      {/* 3. Services */}
      <Services cms={cms} />

      {/* 3. About */}
      <About cms={cms} />

      {/* 4. Certificates */}
      <Certificates />

      {/* 5. Before & After */}
      <BeforeAfter />

      {/* 7. Video — educational content, clinic tour */}
      <VideoSection />

      {/* 8. Testimonials — social proof */}
      <Testimonials cms={cms} />

      {/* 9. Patient Portal — Check live queue, bookings, routines */}
      <PatientPortal />

      {/* 10. How To Use — Guide for Patient Portal */}
      <HowToUse />

      {/* 11. Blog — SEO content & education */}
      <BlogSection cms={cms} />

      {/* 12. Contact + Map */}
      <Contact settings={settings} cms={cms} />

      <Footer settings={settings} cms={cms} />
    </main>
  );
}

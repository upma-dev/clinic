'use client';

import React from 'react';
import Navbar from '@/components/sections/Navbar';
import Testimonials from '@/components/sections/Testimonials';
import Footer from '@/components/sections/Footer';

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-surface">
      <Navbar />
      <div className="pt-24 select-text">
        <Testimonials />
      </div>
      <Footer />
    </main>
  );
}

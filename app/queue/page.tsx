'use client';

import React from 'react';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import QueueStatus from '@/components/sections/QueueStatus';

export default function QueuePage() {
  return (
    <main className="min-h-screen bg-surface selection:bg-accent/30 selection:text-text flex flex-col justify-between">
      <Navbar />

      <div className="pt-28 pb-20 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-playfair text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-4">
              Live Patient Queue
            </h1>
            <p className="font-sans text-sm text-gray-700 font-semibold mb-8">
              Check the current active walk-in timelines and confirmed patients below.
            </p>
            <QueueStatus />
          </div>
        </div>
      </div>

      
      <Footer />
    </main>
  );
}

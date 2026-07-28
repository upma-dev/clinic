'use client';

import React from 'react';
import Navbar from '@/components/sections/Navbar';
import AiAssistant from '@/components/sections/AiAssistant';
import Footer from '@/components/sections/Footer';

export default function AiAssistantPage() {
  return (
    <main className="min-h-screen bg-surface flex flex-col justify-between">
      <Navbar />
      <div className="pt-28 pb-16 px-4 max-w-7xl mx-auto w-full select-text flex-1">
        
        {/* Helper guide */}
        <div className="text-center mb-8 max-w-2xl mx-auto space-y-2">
          <h2 className="font-playfair text-3xl font-extrabold text-gray-900 tracking-tight">
            Consult Our AI Skin Doc & Assistant
          </h2>
          <p className="font-sans text-xs sm:text-sm text-gray-800 leading-normal font-semibold">
            Ask any clinical dermatology questions. Our assistant uses advanced Gemini models customized with localized expertise regarding Dr. Prateek Tiwari&apos;s treatment styles in Freeganj, Ujjain.
          </p>
        </div>

        <AiAssistant />
        
      </div>
      <Footer />
    </main>
  );
}

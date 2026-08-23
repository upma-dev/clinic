/**
 * @file FloatingSidebar.tsx
 * @description Manages floating action buttons for social media (WhatsApp, Instagram) 
 * and the AI Assistant toggle. Handles the slide-over state for the AI chat panel.
 */

'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Instagram, MessageCircle, Bot, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import AiAssistant from '@/components/sections/AiAssistant';
import { motion, AnimatePresence } from 'motion/react';

export default function FloatingSidebar() {
  const pathname = usePathname();
  
  // State to track if the AI Assistant panel is visible
  const [isOpen, setIsOpen] = useState(false);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Left Sidebar - Social Redirects (WhatsApp & Instagram) */}
      <div className="fixed left-4 bottom-6 md:bottom-8 z-50 flex flex-col space-y-4">
        {/* Direct Link to WhatsApp Business */}
        <a 
          href={`https://wa.me/${siteConfig.whatsapp}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12 bg-[#25D366] text-white rounded-full shadow-lg hover:scale-105 transition-transform duration-300"
          title="Connect on Whatsapp"
        >
          <MessageCircle className="w-5.5 h-5.5" fill="currentColor" />
        </a>
        
        {/* Link to Instagram Portfolio */}
        <a 
          href={siteConfig.instagramUrl}
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12 bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white rounded-full shadow-lg hover:scale-105 transition-transform duration-300"
          title="Connect on Instagram"
        >
          <Instagram className="w-5 h-5" />
        </a>
      </div>

      {/* Right Sidebar - AI Assistant Toggle Button */}
      <div className="fixed right-6 bottom-6 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`group flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 relative ${
            isOpen ? 'bg-white text-gray-900 border border-gray-200' : 'bg-teal-500 text-white hover:bg-teal-600 hover:scale-110'
          }`}
          title={isOpen ? "Close Advisor" : "Skin Hub AI Smart Advisor"}
        >
          {/* Change icon based on panel state */}
          {isOpen ? <X className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
          
          {/* Tooltip visible only when closed */}
          {!isOpen && (
            <span className="absolute right-full mr-4 bg-gray-950 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap uppercase tracking-widest border border-white/10">
              Skin Hub AI Advisor
            </span>
          )}
        </button>
      </div>

      {/* AI Assistant Overlay/Panel powered by Motion for smooth entry/exit */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
            className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[410px] h-[650px] max-h-[calc(100vh-120px)] shadow-2xl rounded-3xl overflow-hidden border border-gray-200"
          >
            <div className="bg-white h-full relative">
              <AiAssistant onClose={() => setIsOpen(false)} isSidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile interaction control */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-[55] sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}


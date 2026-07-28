'use client';

import React from 'react';
import { Bell, Phone } from 'lucide-react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export default function PatientTopNav() {
  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full h-[52px] bg-[#FBF8F5] md:hidden">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Logo & Clinic Name */}
        <Link href="/users" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#2F5D50] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {/* Minimal logo mark */}
            <span className="text-white text-[10px] font-bold">SH</span>
          </div>
          <span className="text-[14px] font-medium text-text whitespace-nowrap" style={{ fontFamily: 'var(--font-sans), sans-serif' }}>
            Skin Hub Clinic
          </span>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            className="relative p-1 text-text hover:text-[#2F5D50] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={1.5} />
            {/* Unread notification dot */}
            <span className="absolute top-1.5 right-1 w-2 h-2 bg-[#E8A15D] border border-[#FBF8F5] rounded-full" />
          </button>
          <a 
            href={`tel:${siteConfig.phone}`} 
            className="p-1 text-text hover:text-[#2F5D50] transition-colors"
            aria-label="Call Clinic"
          >
            <Phone size={20} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </header>
  );
}

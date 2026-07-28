/**
 * @file Footer.tsx
 * @description Global footer component for Skin Hub. 
 * Consolidates brand information, quick links, clinical hours, and contact data.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, Instagram, Facebook, Sparkles, Heart } from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { ClinicSettings, CMSContent } from '@/lib/types';

interface FooterProps {
  settings?: ClinicSettings | null;
  cms?: CMSContent | null;
}

export default function Footer({ settings, cms }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const clinicName = settings?.clinicName || siteConfig.clinicName;
  const doctorName = cms?.aboutTitle || siteConfig.doctorName;
  const location = settings?.clinicAddress || cms?.contactAddress || siteConfig.location;
  const phone = settings?.clinicPhone || siteConfig.phone;
  const whatsapp = settings?.clinicPhone?.replace(/[^0-9]/g, '') || siteConfig.whatsapp;
  const instagramUrl = cms?.instagramUrl || siteConfig.instagramUrl;
  const services = cms?.services || siteConfig.services;
  const logoUrl = settings?.clinicLogo || '/assets/logo.png';
  const footerText = cms?.footerText || "Premium, board-certified medical dermatology clinic led by senior consultant Dr. Prateek Tiwari. Restoring skin confidence and vitality through clinical excellence in Ujjain.";
  const copyrightText = cms?.copyrightText || "Skin Hub Clinic. All rights reserved globally in Ujjain, India.";

  return (
    <footer id="site-footer-pane" className="bg-[#1B4B66] text-white border-t-2 border-[#2FA88A] pt-16 pb-8 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Sitemap and Info Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-gray-850">
          
          {/* Col 1: Brand Identity & Introduction */}
          <div className="md:col-span-4 space-y-4 text-left">
            <Link
              href="/"
              className="flex items-center space-x-3 outline-none"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                <img src={logoUrl} alt="Skin Hub Logo" className="w-10 h-10 object-contain p-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-headline font-black text-xl text-white tracking-tight leading-tight block">
                  {clinicName}
                </span>
                <span className="font-sans text-[9px] tracking-wider text-accent uppercase font-bold block">
                  Skin, Hair & Cosmetology
                </span>
              </div>
            </Link>

            <p className="font-sans text-xs text-[#BABABA] leading-relaxed font-semibold">
              {footerText}
            </p>

            {/* Social Proof: Instagram shortcut as requested by user */}
            <div className="pt-2">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-xs font-sans font-bold text-[#EAECEE] hover:text-accent outline-none"
              >
                <Instagram className="w-4 h-4 text-accent" />
                <span>Follow our Skin Diaries</span>
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Shortcuts & Specialized Tools */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-headline text-sm uppercase tracking-widest text-[#EAECEE] font-bold">
              Procedural Core
            </h4>
            <ul className="space-y-2 font-sans text-xs text-[#BABABA] font-semibold">
              {services.map((svc) => (
                <li key={svc.id}>
                  <Link href="/services" className="hover:text-accent transition-colors">
                    {svc.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/ai-assistant" className="hover:text-accent font-bold text-accent transition-colors flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-accent animate-pulse" />
                  AI Skin Doc Assistant
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Operational Coordinates */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-headline text-sm uppercase tracking-widest text-[#EAECEE] font-bold">
              OPD Registration Coordinate
            </h4>
            <div className="space-y-3 font-sans text-xs text-[#BABABA] font-semibold">
              <p className="flex items-start">
                <MapPin className="w-3.5 h-3.5 mr-2 text-accent shrink-0 mt-0.5" />
                <span>{location}</span>
              </p>
              <p className="flex items-center">
                <Phone className="w-3.5 h-3.5 mr-2 text-accent" />
                <a href={`tel:${whatsapp}`} className="hover:text-accent">
                  +91 {phone} (Emergency Dial)
                </a>
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Credits & Copyright Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-[11px] text-[#A3A3A3] font-semibold text-center sm:text-left">
          <p>© {currentYear} {copyrightText}</p>
          <p className="flex items-center">
            Certified Skin Science & Care 
            <Heart className="w-3 h-3 text-red-500 mx-1.5 fill-current" />
            by {doctorName}
          </p>
        </div>

      </div>
    </footer>
  );
}

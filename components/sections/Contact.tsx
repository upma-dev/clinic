/**
 * @file Contact.tsx
 * @description Provides clinical contact coordinates, map location, and outpatient hours. 
 * Facilitates direct patient communication via phone, WhatsApp, and email.
 */

'use client';

import React from 'react';
import { MapPin, Phone, Mail, Clock, ShieldAlert } from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { ClinicSettings, CMSContent } from '@/lib/types';

interface ContactProps {
  settings?: ClinicSettings | null;
  cms?: CMSContent | null;
}

export default function Contact({ settings, cms }: ContactProps) {
  const location = settings?.clinicAddress || cms?.contactAddress || siteConfig.location;
  const phone = settings?.clinicPhone || siteConfig.phone;
  const whatsapp = settings?.clinicPhone?.replace(/[^0-9]/g, '') || siteConfig.whatsapp;
  const email = settings?.clinicEmail || cms?.contactEmail || siteConfig.email;
  const timings = settings ? `${settings.morningStart} AM - ${settings.morningEnd} PM | ${settings.eveningStart} PM - ${settings.eveningEnd} PM (Sunday Closed)` : siteConfig.timings;
  const googleMapsEmbed = cms?.googleMapsEmbed || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115160.85295147804!2d75.76011409726563!3d23.18042450000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3963f1ec3db2cd4d%3A0xe5a3c261b8f5df84!2sSkin%20Hub%20Dermatology%20Clinic!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin";

  return (
    <section id="contact" className="py-20 bg-[#F9F9FB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Responsive Grid layout for contact details vs map localization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Information Column: Structured Contact Matrix */}
          <div className="lg:col-span-6 bg-white border border-gray-300 rounded-2xl p-6 sm:p-10 shadow-lg text-left flex flex-col justify-between">
            <div className="space-y-6">
              
              <div className="space-y-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider">
                  Contact Matrix
                </span>
                <h3 className="font-playfair text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Reach Our Desk
                </h3>
                <p className="font-sans text-xs sm:text-sm text-gray-800 leading-relaxed font-semibold">
                  Have skin queries or scheduling doubts? Call our desk directly or send us custom consultation messages.
                </p>
              </div>

              {/* Coordinates */}
              <div className="space-y-4 pt-2">
                
                {/* Clinic Address */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-sans text-[10px] font-black uppercase text-gray-800 tracking-widest leading-none">
                      Clinic Address
                    </p>
                    <p className="font-sans text-xs sm:text-sm text-gray-900 leading-relaxed font-bold">
                      {location}
                    </p>
                  </div>
                </div>

                {/* Phone / Whatsapp */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-sans text-[10px] font-black uppercase text-gray-800 tracking-widest leading-none">
                      Phone / Whatsapp Desk
                    </p>
                    <a
                      href={`tel:${whatsapp}`}
                      className="font-sans text-xs sm:text-sm text-gray-900 font-bold hover:text-accent select-all leading-normal"
                    >
                      +91 {phone} (Direct Dial)
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-sans text-[10px] font-black uppercase text-gray-800 tracking-widest leading-none">
                      Administrative Email
                    </p>
                    <p className="font-sans text-xs sm:text-sm text-gray-900 font-bold select-all leading-normal">
                      {email}
                    </p>
                  </div>
                </div>

                {/* Outpatient Clinic Hours */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-sans text-[10px] font-black uppercase text-gray-800 tracking-widest leading-none">
                      Outpatient Clinic Hours
                    </p>
                    <p className="font-sans text-xs sm:text-sm text-gray-900 leading-relaxed font-bold">
                      {timings}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Sunday/Holiday Alert Notice */}
            <div className="p-4 bg-[#F8F6F2] rounded-xl border border-gray-300 mt-6 text-left flex items-start space-x-2.5">
              <ShieldAlert className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="font-sans text-[11px] text-gray-800 leading-normal font-semibold">
                ⚠️ <strong>Sunday Closed:</strong> Physical OPD hours are closed on Sundays. Online dynamic appointment pre-registrations for the weekly slot are open 24x7.
              </p>
            </div>

          </div>

          {/* Map Column */}
          <div className="lg:col-span-6 bg-white border border-gray-300 rounded-2xl overflow-hidden shadow-lg flex flex-col items-stretch relative min-h-[350px]">
            <iframe
              src={googleMapsEmbed}
              title="Skin Hub Clinic Location Map"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '350px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full"
            />
          </div>

        </div>

      </div>
    </section>
  );
}

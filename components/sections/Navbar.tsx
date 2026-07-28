/**
 * @file Navbar.tsx
 * @description Global navigation component for Skin Hub. 
 * Includes a top info bar with clinical hours and a main navigation bar 
 * with a responsive mobile drawer powered by framer-motion.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calendar, Phone, Bot, Pin, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { siteConfig } from '@/config/site';
import type { ClinicSettings, CMSContent } from '@/lib/types';

type NavLink = {
  name: string;
  href?: string;
  subItems?: { name: string; href: string }[];
};

export default function Navbar({ settings, cms }: { settings?: ClinicSettings | null; cms?: CMSContent | null }) {
  const clinicName = settings?.clinicName || siteConfig.clinicName;
  const phone = settings?.clinicPhone || siteConfig.phone;
  const whatsapp = settings?.clinicPhone?.replace(/[^0-9]/g, '') || siteConfig.whatsapp;
  const logoUrl = settings?.clinicLogo || '/assets/logo.png';
  const timingsText = settings ? `${settings.morningStart} AM - ${settings.morningEnd} PM | ${settings.eveningStart} PM - ${settings.eveningEnd} PM` : '09:00 AM - 08:30 PM (Daily)';
  const [isOpen, setIsOpen] = useState(false);
  const [openMobileMenus, setOpenMobileMenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  // Scrollspy for in-page sections on routes like /gallery
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Navigation schema organized with dropdown sub-sections for a cleaner look
  const navLinks: NavLink[] = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { 
      name: 'Clinic',
      subItems: [
        { name: 'About Us', href: '/about' },
        { name: 'Gallery', href: '/gallery' },
        { name: 'Blogs', href: '/blog' },
        { name: 'Online Consultation', href: '/online-consultation' },
        { name: 'Contact', href: '/contact' }
      ]
    },
    {
      name: 'Portals',
      subItems: [
        { name: 'Patient Portal', href: '/users' },
        { name: 'Live Queue', href: '/queue' }
      ]
    }
  ];

  // Observe visible sections and update active nav highlight.
  React.useEffect(() => {
    if (pathname !== '/') {
      setActiveSection(null);
      return;
    }

    const sectionIds = ['home', 'services', 'about', 'gallery', 'before-after', 'video-section', 'queue', 'contact'];

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));

        if (visible[0]?.target?.id) setActiveSection(visible[0].target.id);
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65], rootMargin: '-80px 0px -60% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  const toggleMobileMenu = (name: string) => {
    setOpenMobileMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <nav id="site-header-nav" className="fixed top-0 left-0 w-full z-50">
      
      {/* Top Info Bar */}
      <div className="bg-[#0B1B29] text-teal-400 py-1.5 px-4 hidden md:flex items-center justify-between text-[11px] font-sans font-bold tracking-wide">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="flex items-center uppercase tracking-widest bg-teal-900/40 px-3 py-0.5 rounded-full border border-teal-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mr-2 animate-pulse" />
              Best Dermatologist in Ujjain
            </span>
            <span className="px-3 border-l border-teal-800 flex items-center">
              <Pin className="w-3 h-3 mr-2" />
              Freeganj Clinic: {timingsText}
            </span>
          </div>
          <div className="flex items-center space-x-6 text-gray-300">
            <a href={`tel:${whatsapp}`} className="hover:text-white transition-colors flex items-center group">
              <Phone className="w-3 h-3 mr-1.5 text-teal-500 group-hover:scale-110" />
              +91 {whatsapp}
            </a>
            <span className="flex items-center">
               <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-2" />
               UJJAIN, MP
            </span>
          </div>
        </div>
      </div>

      {/* Main Branding & Navigation Container */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Branding Area */}
            <Link
              id="navbar-logo-link"
              href="/"
              className="flex items-center space-x-3 group outline-none"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                <img src={logoUrl} alt="Skin Hub Logo" className="w-10 h-10 object-contain p-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-headline font-black text-lg sm:text-2xl text-primary tracking-tight leading-tight select-none">
                  {clinicName}
                </span>
                <span className="font-sans text-[10px] tracking-widest text-accent uppercase font-bold select-none">
                  Skin & Cosmetology
                </span>
              </div>
            </Link>

            {/* Desktop Link row with Dropdowns */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => {
                // Dropdown Sub-section
                if (link.subItems) {
                  const isChildActive = link.subItems.some(sub => pathname === sub.href);
                  return (
                    <div key={link.name} className="relative group">
                      <button 
                        className={`px-3 py-2 rounded-md font-sans text-xs xl:text-sm font-bold tracking-wide transition-all outline-none flex items-center ${
                          isChildActive ? 'text-primary bg-primary/5' : 'text-gray-900 hover:text-primary hover:bg-gray-50'
                        }`}
                      >
                        {link.name}
                        <ChevronDown className="w-3.5 h-3.5 ml-1 transition-transform group-hover:rotate-180" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute top-full left-0 hidden group-hover:block pt-2 w-48">
                        <div className="bg-white border border-gray-100 rounded-xl shadow-xl py-2 flex flex-col gap-1">
                          {link.subItems.map((sub) => (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              className={`px-4 py-2.5 text-xs xl:text-sm font-bold font-sans transition-colors ${
                                pathname === sub.href 
                                  ? 'text-primary bg-primary/5' 
                                  : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                              }`}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Standard Link
                let isHighlighted = false;
                if (pathname === '/') {
                  if (link.href === '/') {
                    isHighlighted = activeSection === 'home' || activeSection === null;
                  } else {
                    isHighlighted = link.href ? activeSection === link.href.replace('/', '') : false;
                  }
                } else {
                  isHighlighted = pathname === link.href;
                }

                return (
                  <Link
                    key={link.name}
                    href={link.href!}
                    className={`px-3 py-2 rounded-md font-sans text-xs xl:text-sm font-bold tracking-wide transition-all outline-none ${
                      isHighlighted
                        ? 'text-primary bg-primary/5 border border-primary/20'
                        : 'text-gray-900 hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* CTA panel buttons for desktop users */}
            <div className="hidden lg:flex items-center space-x-3">
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center text-xs font-bold font-sans text-gray-900 hover:text-primary shrink-0 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 mr-1.5 text-primary" />
                {phone}
              </a>
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-4 py-2.5 border-2 border-primary text-primary hover:bg-primary/5 transition-colors duration-200 font-bold font-sans text-xs rounded-xl shrink-0 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Book Appointment
              </Link>
            </div>

            {/* Mobile View Toggle and Action icons */}
            <div className="flex items-center lg:hidden space-x-3">
              <Link
                href="/booking"
                className="p-2 bg-primary text-white rounded-lg hover:bg-accent hover:text-gray-900 transition-colors"
                title="Book Slot"
              >
                <Calendar className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-900 hover:text-primary outline-none focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation: uses Framer Motion for smooth height transitions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden shadow-lg text-left"
          >
            <div className="px-4 pt-3 pb-6 space-y-2.5">
              {navLinks.map((link) => {
                if (link.subItems) {
                  const isMenuOpen = openMobileMenus[link.name];
                  return (
                    <div key={link.name} className="flex flex-col border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
                      <button 
                        onClick={() => toggleMobileMenu(link.name)}
                        className="flex items-center justify-between px-4 py-3 font-sans text-sm font-bold text-gray-900"
                      >
                        {link.name}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white border-t border-gray-100 overflow-hidden"
                          >
                            <div className="flex flex-col py-2">
                              {link.subItems.map((sub) => (
                                <Link
                                  key={sub.name}
                                  href={sub.href}
                                  onClick={() => setIsOpen(false)}
                                  className={`px-6 py-2.5 font-sans text-sm font-semibold transition-all ${
                                    pathname === sub.href
                                      ? 'text-primary bg-primary/5 border-l-4 border-primary pl-5'
                                      : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                                  }`}
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href!}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 rounded-xl font-sans text-sm font-bold transition-all ${
                    isActive || (link.href && activeSection === link.href.replace('/', ''))
                        ? 'text-primary bg-primary/8 border-l-4 border-primary pl-3'
                        : 'text-gray-900 hover:text-primary hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              
              {/* Internal Mobile Call Action */}
              <div className="pt-4 mt-2 border-t border-gray-100 flex flex-col space-y-3 px-2">
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="flex items-center text-xs font-bold text-gray-900"
                >
                  <Phone className="w-4 h-4 mr-2 text-primary" />
                  {phone}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

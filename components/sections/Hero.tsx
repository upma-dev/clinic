'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Award, ShieldCheck, MapPin, Star, Sparkles } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring } from 'motion/react';
import Script from 'next/script';
import type { ClinicSettings, CMSContent } from '@/lib/types';

interface HeroProps {
  settings?: ClinicSettings | null;
  cms?: CMSContent | null;
}

export default function Hero({ settings, cms }: HeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef(null);

  const clinicName = settings?.clinicName || siteConfig.clinicName;
  const doctorName = cms?.aboutTitle || siteConfig.doctorName;
  const credentials = cms?.aboutSubtitle || siteConfig.credentials;
  const phone = settings?.clinicPhone || siteConfig.phone;
  const timings = settings ? `${settings.morningStart} AM - ${settings.morningEnd} PM | ${settings.eveningStart} PM - ${settings.eveningEnd} PM` : siteConfig.timings;

  const heroTitleLine1 = cms?.heroTitleLine1 || "Advanced Skin, Hair";
  const heroTitleLine2 = cms?.heroTitleLine2 || "Laser Care in Ujjain";
  const heroSubtitle = cms?.heroSubtitle || "Best Dermatologist in Ujjain for Advanced Skin, Hair & Laser Care";
  const heroDescription = cms?.heroDescription || "Trusted by thousands of patients for modern dermatology and hair restoration. Managed by expert Dr. Prateek Tiwari, MBBS, DVD (Dermatology).";
  const heroBadge1 = cms?.heroBadge1 || "BEST DERMATOLOGIST IN UJJAIN";
  const heroBadge2 = cms?.heroBadge2 || "TOP RATED SKIN SPECIALIST";
  const heroExperienceBadge = cms?.heroExperienceBadge || "12+ Years";
  const heroExperienceText = cms?.heroExperienceText || "EXPERIENCE";
  const heroImageUrl = cms?.heroImageUrl || "/assets/doctor.png";

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "name": clinicName,
    "image": "https://skinhub.in/assets/doctor.png",
    "description": heroSubtitle,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Ujjain",
      "addressRegion": "MP",
      "addressCountry": "IN"
    },
    "url": "https://skinhub.in",
    "telephone": phone,
    "medicalSpecialty": "Dermatology",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "2400"
    }
  };
  
  // Parallax effect for the doctor photo on scroll down
  const { scrollY } = useScroll();
  const photoY = useTransform(scrollY, [0, 500], [0, 20]);

  // Mouse parallax for the background grid
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 30, stiffness: 100, mass: 1 };
  const parallaxX = useSpring(mouseX, springConfig);
  const parallaxY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (shouldReduceMotion) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    // Shift opposite to mouse, max 6px
    const x = ((clientX / innerWidth) - 0.5) * -12; 
    const y = ((clientY / innerHeight) - 0.5) * -12; 
    mouseX.set(x);
    mouseY.set(y);
  };

  // Premium, calm easing curve (cubic-bezier(0.16, 1, 0.3, 1))
  const customEase = [0.16, 1, 0.3, 1] as const;

  return (
    <section 
      id="home" 
      ref={containerRef} 
      onMouseMove={handleMouseMove}
      className="relative pt-32 pb-20 bg-[#F9FBFC] overflow-hidden min-h-[90vh] flex items-center"
    >
      <Script
        id="medical-clinic-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      {/* Animated Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={shouldReduceMotion ? {} : {
            x: [0, 40, 0, -40, 0],
            y: [0, 20, -20, 10, 0],
            scale: [1, 1.1, 1, 1.05, 1],
            backgroundColor: ["#14b8a6", "#3b82f6", "#8b5cf6", "#14b8a6"],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[80px]"
        />
        <motion.div 
          animate={shouldReduceMotion ? {} : {
            x: [0, -30, 20, -20, 0],
            y: [0, -40, 30, -20, 0],
            scale: [1, 1.15, 0.95, 1.1, 1],
            backgroundColor: ["#f59e0b", "#ec4899", "#14b8a6", "#f59e0b"],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.10] blur-[80px]"
        />
        <motion.div 
          animate={shouldReduceMotion ? {} : {
            x: [0, 30, -30, 20, 0],
            y: [0, 30, 20, -30, 0],
            scale: [1, 1.05, 1.15, 0.95, 1],
            backgroundColor: ["#3b82f6", "#14b8a6", "#f59e0b", "#3b82f6"],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[100px]"
        />
      </div>

      {/* Grid Pattern Background */}
      <motion.div 
        style={{ x: parallaxX, y: parallaxY }}
        className="absolute inset-0 z-0 opacity-15 overflow-hidden pointer-events-none"
      >
        <svg
          className="w-[300%] h-[300%] text-primary animate-grid-drift motion-reduce:animate-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dotPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" className="fill-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotPattern)" />
        </svg>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Main Content */}
          <div className="lg:col-span-7 text-left space-y-6">

            {/* Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.15, delay: 0, ease: customEase }}
              className="flex flex-wrap gap-2 mb-4"
            >
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#E0F2F1] text-teal-700 font-sans text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-teal-200 cursor-default">
                <Star className="w-3 h-3 mr-2 text-teal-600 fill-teal-600" />
                {heroBadge1}
              </span>
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 font-sans text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-amber-200 cursor-default">
                <Award className="w-3 h-3 mr-2 text-amber-600" />
                {heroBadge2}
              </span>
            </motion.div>

            {/* Headline */}
            <h1 className="font-playfair text-4xl sm:text-5xl lg:text-[4rem] font-black text-gray-900 leading-[1.1] tracking-tight">
              <motion.span 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : 0.15, ease: customEase }}
                className="inline-block"
              >
                {heroTitleLine1.split(' ').map((w, i) => (
                  <span key={i} className={i === 1 ? "text-accent mx-1" : i === 2 ? "text-accent mx-1" : ""}>{w} </span>
                ))}
              </motion.span>
              <br />
              <motion.span 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : 0.25, ease: customEase }}
                className="inline-block"
              >
                {heroTitleLine2}
              </motion.span>
            </h1>

            {/* Paragraph */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.15, delay: shouldReduceMotion ? 0 : 0.45, ease: customEase }}
              className="font-sans text-base sm:text-xl text-gray-700 leading-relaxed max-w-xl"
            >
              {heroDescription}
            </motion.p>

            {/* Location/Hours Card */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.1, delay: shouldReduceMotion ? 0 : 0.6, ease: customEase }}
              className="bg-white p-6 border border-gray-150 rounded-2xl shadow-sm max-w-lg flex items-start space-x-4"
            >
              <div className="bg-primary/10 p-3 rounded-full shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-primary block">
                  Clinical Center: Freeganj, Ujjain
                </span>
                <span className="font-sans text-sm font-bold text-gray-900 block">
                  {clinicName} — Clinical & Aesthetic Solutions
                </span>
                <span className="font-sans text-[12px] text-gray-600 block">
                  {timings}
                </span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.1, delay: shouldReduceMotion ? 0 : 0.7, ease: customEase }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                href="/booking"
                className="group inline-flex items-center justify-center px-8 py-4 bg-primary hover:brightness-90 text-white font-sans font-bold text-sm lg:text-base rounded-xl transition-colors duration-150 cursor-pointer"
              >
                <Calendar className="w-5 h-5 mr-2 transition-transform duration-150 ease-out group-hover:translate-x-[2px]" />
                Book Consultation
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary text-primary hover:border-[#1F2A28] font-sans font-bold text-sm rounded-xl bg-transparent transition-colors duration-150"
              >
                View All Services
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2, delay: shouldReduceMotion ? 0 : 0.75, ease: customEase }}
              className="pt-4 flex items-center space-x-3 text-xs font-sans font-bold text-gray-400 uppercase tracking-widest cursor-default"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Verified 4.9+ Star Rated Clinic in Ujjain</span>
            </motion.div>
          </div>

          {/* Doctor Image Container */}
          <motion.div 
            style={shouldReduceMotion ? {} : { y: photoY }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6, delay: shouldReduceMotion ? 0 : 0.2, ease: customEase }}
            className="lg:col-span-5 relative flex justify-center mt-12 lg:mt-0 group cursor-default"
          >
            <div className="relative w-full max-w-[360px] aspect-[3/4]">

              <div className="absolute inset-0 rounded-[40px] shadow-sm overflow-hidden border-8 border-white bg-slate-200 z-10">
                <Image
                  src={heroImageUrl}
                  alt={`${doctorName} - Best Dermatologist in Ujjain`}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 360px"
                />
              </div>

              {/* Floating Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.15, delay: shouldReduceMotion ? 0 : 0.8, ease: customEase }}
                className="absolute top-6 right-6 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/50 z-20 transition-all duration-300 lg:group-hover:-translate-y-[2px] shadow-sm lg:group-hover:shadow-md"
              >
                <p className="font-sans text-sm font-black text-gray-800 text-center leading-tight">{heroExperienceBadge}</p>
                <p className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">{heroExperienceText}</p>
              </motion.div>

              {/* Bottom Card */}
              <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white z-20 flex items-center space-x-4">
                <div className="bg-primary p-2.5 rounded-full shrink-0 shadow-sm text-white">
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-playfair text-lg font-black text-gray-900 leading-none uppercase">{doctorName}</span>
                  <span className="font-sans text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    {credentials} • TOP DERMATOLOGIST IN UJJAIN
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

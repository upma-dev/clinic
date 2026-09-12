'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, CheckCircle, Bell, Clock, ArrowRight, UserCheck, ChevronLeft, ChevronRight, Pause, Hand } from 'lucide-react';

export default function HowToUse() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePortalClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const portalSection = document.getElementById('patient-portal');
    if (portalSection) {
      e.preventDefault();
      portalSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const steps = [
    {
      icon: <Smartphone className="w-8 h-8 text-white" />,
      title: "1. Access Patient Portal",
      desc: "Enter your mobile number in the Patient Portal above to securely access your account.",
      color: "from-blue-500 to-indigo-600",
      showButton: true
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-white" />,
      title: "2. Build Your Routine",
      desc: "Add your morning and night skincare items, medications, and treatments to your timeline.",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: <Bell className="w-8 h-8 text-white" />,
      title: "3. Get Smart Reminders",
      desc: "Turn on notifications and we will remind you exactly when it's time for your treatment.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: <Clock className="w-8 h-8 text-white" />,
      title: "4. Live Queue Tracking",
      desc: "Check the live clinic waitlist and book an arrival window before you visit the clinic.",
      color: "from-purple-500 to-pink-600"
    }
  ];

  // Auto-scroll interval (3.5 seconds per step)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPaused, steps.length]);

  const handleTouchStart = () => {
    setIsPaused(true);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2500);
  };

  const nextStep = () => {
    setActiveIndex((prev) => (prev + 1) % steps.length);
  };

  const prevStep = () => {
    setActiveIndex((prev) => (prev === 0 ? steps.length - 1 : prev - 1));
  };

  return (
    <section className="py-6 sm:py-12 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="text-center mb-6 sm:mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-playfair text-3xl sm:text-4xl font-black text-gray-900 mb-4"
          >
            How to use the <span className="text-primary italic">Patient Portal</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-sans text-gray-600 max-w-2xl mx-auto mb-6"
          >
            A simple, 4-step guide to managing your skin health and clinic visits seamlessly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <Link
              href="/users"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg group cursor-pointer border border-primary/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>Go to Patient Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Card Section with Auto-Scroll & Touch/Hover Pause */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative max-w-5xl mx-auto"
        >
          {/* Mobile / Tablet View: Animated Carousel */}
          <div className="block lg:hidden relative min-h-[280px]">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={prevStep}
                className="p-2.5 rounded-full border border-gray-200 bg-white/90 shadow-md hover:bg-gray-50 shrink-0 z-20 cursor-pointer active:scale-95 transition-transform"
                aria-label="Previous step"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>

              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="bg-surface rounded-3xl p-6 sm:p-8 border-2 border-primary/20 shadow-md relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${steps[activeIndex].color} opacity-15 rounded-bl-full -mr-8 -mt-8`} />

                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${steps[activeIndex].color} shadow-lg flex items-center justify-center mb-6`}>
                        {steps[activeIndex].icon}
                      </div>

                      <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-3">
                        {steps[activeIndex].title}
                      </h3>
                      <p className="font-sans text-base text-gray-600 leading-relaxed">
                        {steps[activeIndex].desc}
                      </p>
                    </div>

                    {steps[activeIndex].showButton && (
                      <div className="mt-6 pt-4 border-t border-gray-200/60">
                        <Link
                          href="/users#patient-portal"
                          onClick={handlePortalClick}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-accent transition-colors group/link"
                        >
                          <span>Open Patient Portal</span>
                          <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="p-2.5 rounded-full border border-gray-200 bg-white/90 shadow-md hover:bg-gray-50 shrink-0 z-20 cursor-pointer active:scale-95 transition-transform"
                aria-label="Next step"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Desktop View: Grid with Auto-Highlighted Active Step */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-6">
            {steps.map((step, i) => {
              const isActive = activeIndex === i;
              return (
                <div
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`bg-surface rounded-3xl p-7 border transition-all duration-500 relative overflow-hidden group flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/30 shadow-xl scale-[1.03] bg-gradient-to-b from-teal-50/40 via-white to-white'
                      : 'border-gray-100 shadow-xs hover:border-gray-300 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${step.color} ${isActive ? 'opacity-20 scale-110' : 'opacity-10'} rounded-bl-full -mr-8 -mt-8 transition-all`} />

                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} shadow-md flex items-center justify-center mb-5 transform ${isActive ? 'scale-110 rotate-0' : '-rotate-3 group-hover:rotate-0'} transition-transform`}>
                      {step.icon}
                    </div>

                    <h3 className="font-playfair text-lg font-bold text-gray-900 mb-2.5">{step.title}</h3>
                    <p className="font-sans text-xs text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>

                  {step.showButton && (
                    <div className="mt-5 pt-3.5 border-t border-gray-200/60">
                      <Link
                        href="/users#patient-portal"
                        onClick={handlePortalClick}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent transition-colors group/link"
                      >
                        <span>Open Patient Portal</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center space-x-2 mt-6">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeIndex === idx ? 'w-8 bg-primary' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Touch / Hover Pause Hint Notice */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200/80 py-2.5 px-4 rounded-full max-w-fit mx-auto shadow-xs transition-all">
            <Hand className="w-4 h-4 text-primary animate-bounce shrink-0" />
            <span>Touch or hover card to pause auto-scroll | कार्ड को टच या होवर करने से ऑटो-स्क्रॉल रुक जाएगा</span>
            {isPaused && (
              <span className="ml-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Pause className="w-3 h-3" /> Paused
              </span>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}

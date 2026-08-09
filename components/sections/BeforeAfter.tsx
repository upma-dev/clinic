'use client';

/**
 * @file BeforeAfter.tsx
 * @description Interactive before/after image comparison slider.
 *
 * HOW TO USE:
 * 1. Add your before/after image pairs to the `cases` array below.
 * 2. Images go in /public/assets/before-after/ folder.
 * 3. Recommended image size: 600x700px (portrait works best for skin treatments).
 * 4. Drag the slider handle left/right to reveal before/after.
 *
 * PRIVACY NOTE:
 * Make sure you have written patient consent before publishing any before/after photos.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, MoveHorizontal, Shield, ArrowRight } from 'lucide-react';

interface BeforeAfterCase {
  id: number;
  treatment: string;
  duration: string;
  sessions: string;
  beforeAlt: string;
  afterAlt: string;
  beforeSrc: string;
  afterSrc: string;
  tag: string;
}

// ─────────────────────────────────────────────────────────
// ADD YOUR REAL PATIENT BEFORE/AFTER IMAGES HERE
// Place images in: public/assets/before-after/
// Format: /assets/before-after/acne-before-1.jpg
// ─────────────────────────────────────────────────────────
const cases: BeforeAfterCase[] = [
  {
    id: 1,
    treatment: 'Acne & Scar Treatment',
    duration: '6 Weeks',
    sessions: '4 Sessions',
    tag: 'Most Popular',
    beforeSrc: '/assets/before1.jpeg',
    afterSrc: '/assets/after1.jpeg',
    beforeAlt: 'Patient with active acne and scarring before treatment at Skin Hub Ujjain',
    afterAlt: 'Clear skin after acne treatment at Skin Hub Dermatology Clinic Ujjain',
  },
  {
    id: 2,
    treatment: 'PRP Hair Therapy',
    duration: '3 Months',
    sessions: '6 Sessions',
    tag: 'Hair Loss',
    beforeSrc: '/assets/before1.jpeg',
    afterSrc: '/assets/after1.jpeg',
    beforeAlt: 'Patient with hair thinning before PRP therapy at Skin Hub Ujjain',
    afterAlt: 'Fuller hair after PRP hair restoration therapy at Skin Hub Ujjain',
  },
  {
    id: 3,
    treatment: 'Skin Brightening & Yellow Peel',
    duration: '4 Weeks',
    sessions: '3 Sessions',
    tag: 'Pigmentation',
    beforeSrc: '/assets/before1.jpeg',
    afterSrc: '/assets/after1.jpeg',
    beforeAlt: 'Skin with pigmentation and dark spots before yellow peel treatment',
    afterAlt: 'Bright even skin tone after yellow peel at Skin Hub dermatology clinic Ujjain',
  },
  {
    id: 4,
    treatment: 'Anti-Ageing Treatment',
    duration: '8 Weeks',
    sessions: '3 Sessions',
    tag: 'Anti-Ageing',
    beforeSrc: '/assets/before1.jpeg',
    afterSrc: '/assets/after1.jpeg',
    beforeAlt: 'Skin with fine lines and wrinkles before anti-ageing treatment Ujjain',
    afterAlt: 'Younger looking skin after anti-ageing dermatology treatment at Skin Hub',
  },
];

// ─────────────────────────────────────────────────────────
// Slider component — one card
// ─────────────────────────────────────────────────────────
function SliderCard({ item }: { item: BeforeAfterCase }) {
  const [sliderPos, setSliderPos] = useState(50); // 0-100 percent
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState({ before: false, after: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const calcPos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  // Mouse events
  const onMouseDown = () => setIsDragging(true);
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) calcPos(e.clientX);
    },
    [isDragging, calcPos]
  );
  const onMouseUp = () => setIsDragging(false);

  // Touch events
  const onTouchStart = () => setIsDragging(true);
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging) calcPos(e.touches[0].clientX);
    },
    [isDragging, calcPos]
  );
  const onTouchEnd = () => setIsDragging(false);

  // Global mouseup so dragging stops even if cursor leaves container
  useEffect(() => {
    const stop = () => setIsDragging(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200 hover:border-accent transition-all duration-300 hover:shadow-xl h-full">
      <div className="flex flex-col h-full">
        {/* Treatment info header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-none">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider mb-1">
              {item.tag}
            </span>
            <h3 className="font-playfair text-base font-bold text-gray-900">{item.treatment}</h3>
            <p className="font-sans text-xs text-gray-500 mt-0.5">
              {item.sessions} &nbsp;·&nbsp; {item.duration}
            </p>
          </div>
          <MoveHorizontal className="w-5 h-5 text-gray-300" />
        </div>

        {/* Slider area (must stretch equally across cards) */}
        <div className="flex-1 flex min-h-[260px] sm:min-h-[280px]">
          <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Keep image proportions consistent */}
            <div className="absolute inset-0">
              {/* keep consistent visual height */}
              {/* AFTER image — full width base layer */}
              {imageError.after ? (
                <PlaceholderImage label="AFTER" color="#1B4F72" />
              ) : (
                <Image
                  src={item.afterSrc}
                  alt={item.afterAlt}
                  fill
                  className="object-cover pointer-events-none"
                  sizes="(max-width: 768px) 100vw, 300px"
                  onError={() => setImageError((p) => ({ ...p, after: true }))}
                />
              )}
              <span className="absolute bottom-3 right-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full z-10">
                After
              </span>

              {/* BEFORE image — clipped to left of slider */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                {imageError.before ? (
                  <PlaceholderImage label="BEFORE" color="#6B7280" />
                ) : (
                  <Image
                    src={item.beforeSrc}
                    alt={item.beforeAlt}
                    fill
                    className="object-cover pointer-events-none"
                    sizes="(max-width: 768px) 100vw, 300px"
                    onError={() => setImageError((p) => ({ ...p, before: true }))}
                  />
                )}
                <span className="absolute bottom-3 left-3 bg-gray-700 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full z-10">
                  Before
                </span>
              </div>

              {/* Divider line */}
              <div
                className="absolute inset-y-0 z-20 pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute inset-y-0 -translate-x-px w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]" />
              </div>

              {/* Drag handle */}
              <div
                className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-xl border-2 border-primary flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <ChevronLeft className="w-3 h-3 text-primary" />
                    <ChevronRight className="w-3 h-3 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drag hint */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5 flex-none">
          <MoveHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-sans text-[11px] text-gray-400">Drag slider to compare</span>
        </div>
      </div>
    </div>
  );
}

// Placeholder shown when real image isn't added yet
function PlaceholderImage({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ background: label === 'BEFORE' ? '#E5E7EB' : '#E0EDF6' }}
    >
      <span className="font-sans text-2xl font-black" style={{ color }}>
        {label}
      </span>
      <span className="font-sans text-xs text-gray-400 text-center px-4">
        Add patient photo to<br />
        <code className="text-[10px] bg-white/60 px-1 rounded">public/assets/before-after/</code>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main exported section
// ─────────────────────────────────────────────────────────
export default function BeforeAfter() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (index: number) => {
    setActiveIndex(index);
    const container = scrollRef.current;
    if (!container) return;
    const card = container.children[index] as HTMLElement;
    if (card) {
      container.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
    }
  };

  return (
    <section id="before-after" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Real Results
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Patient Transformations
          </h2>
          <p className="font-sans text-gray-500 mt-3 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Drag the slider on each photo to see real before & after results from our patients at{' '}
            <strong>Skin Hub, Ujjain</strong>.
          </p>

          <div className="mt-6">
            <Link
              href="/gallery"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-accent hover:text-gray-900 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              View all gallery
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Tab pills — desktop treatment filter */}
        <div className="hidden sm:flex justify-center gap-2 mb-10 flex-wrap">
          {cases.map((c, i) => (
            <button
              key={c.id}
              onClick={() => scrollTo(i)}
              className={`px-4 py-1.5 rounded-full font-sans text-xs font-bold transition-all border ${
                activeIndex === i
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {c.tag}
            </button>
          ))}
        </div>

        {/* Cards grid — 4 on desktop, horizontal scroll on mobile */}
        <div
          ref={scrollRef}
          className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-6 overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 snap-x snap-mandatory sm:snap-none scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {cases.map((item) => (
            <div key={item.id} className="min-w-[280px] sm:min-w-0 snap-start h-full">
              <SliderCard item={item} />
            </div>
          ))}
        </div>

        {/* Mobile dot indicators */}
        <div className="flex sm:hidden justify-center gap-2 mt-6">
          {cases.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                activeIndex === i ? 'bg-primary w-5' : 'bg-gray-300'
              }`}
              aria-label={`Go to case ${i + 1}`}
            />
          ))}
        </div>

        {/* Consent notice */}
        <div className="mt-10 flex items-start justify-center gap-2 text-center">
          <Shield className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-gray-400 max-w-md">
            All photos shared with written patient consent. Individual results may vary. Book a consultation to discuss your specific skin concern with Dr. Prateek Tiwari.
          </p>
        </div>
      </div>
    </section>
  );
}


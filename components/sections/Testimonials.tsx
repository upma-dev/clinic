'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CMSContent } from '@/lib/types';

interface TestimonialsProps {
  cms?: CMSContent | null;
}

const defaultReviews = [
  {
    quote: "Mere purane active acne aur pimple ke khadde (scars) ke liye maine Dr. Prateek Tiwari se yellow peels karvaye. 3 sittings me hi skin texture aur confidence bilkul change ho gaya. Dr. Sahab consultation me bohot supportive hain.",
    author: "Kuldeep Solanki, Dewas Road",
    role: "Verified JustDial Acne Patient",
    rating: 5,
    date: "2 Days ago"
  },
  {
    quote: "Main hair thinning se bohot pareshan tha, hair line piche ja rahi thi. Skin Hub clinic me PRP Therapy (3 sessions) karayi. Hair volume bohot improve hua h. Fees aur details pehle se clear rehti hai.",
    author: "Prateeksha Rathore, Freeganj",
    role: "Verified JustDial PRP Client",
    rating: 5,
    date: "1 Week ago"
  },
  {
    quote: "Outstanding aesthetic clinical clean environment! Melasma pigmentation thik karne ke liye yellow chemical peels and glutathione best results dete hain. Fully satisfied with Dr. Prateek's skin expertise.",
    author: "Abhishek Malviya, Nanakheda",
    role: "Verified JustDial Pigmentation Patient",
    rating: 5,
    date: "2 Weeks ago"
  },
  {
    quote: "I am highly satisfied with the acne scars laser therapy. The cost is genuinely affordable compared to other doctors in Indore. Recommended for anyone who wants authentic skin treatments.",
    author: "Harsh Vardhan, Mahakal Marg Ujjain",
    role: "Verified JustDial Laser Care Patient",
    rating: 5,
    date: "1 Month ago"
  }
];

export default function Testimonials({ cms }: TestimonialsProps) {
  const reviews = cms?.testimonials?.map(t => ({
    quote: t.text,
    author: t.name,
    role: t.role,
    rating: t.rating || 5,
    date: 'Recently'
  })) || defaultReviews;

  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  // Auto-scroll loop effect
  useEffect(() => {
    if (hovered) return; // Pause transition if patient hovers to read easily
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reviews.length);
    }, 4500); // Cycle automatically every 4.5 seconds
    return () => clearInterval(interval);
  }, [reviews.length, hovered]);

  return (
    <section id="testimonials" className="py-22 bg-stone-50 select-none overflow-hidden relative border-t border-b border-gray-200">

      {/* Decorative Background Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="relative z-10">

        {/* Section Header */}
        <div className="mb-12 text-center px-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600" />
            Verified Case Reviews
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Loved By Residents of Ujjain
          </h2>
        </div>

        {/* Infinite Horizontal Scroller */}
        <motion.div
          initial={{ opacity: 0, rotateX: 30, y: 50 }}
          whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
          style={{ perspective: '1200px' }}
          className="flex overflow-hidden group"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="flex animate-scroll hover:[animation-play-state:paused] whitespace-nowrap">
            {[...reviews, ...reviews].map((review, idx) => (
              <div
                key={idx}
                className="inline-block w-[350px] sm:w-[450px] mx-4 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-shadow whitespace-normal shrink-0"
              >
                <div className="flex items-center space-x-1.5 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-teal-500 text-teal-500" />
                  ))}
                  <span className="text-[10px] uppercase font-sans tracking-widest font-black text-teal-700 ml-2 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                    JUSTDIAL VERIFIED
                  </span>
                </div>

                <p className="font-serif italic text-gray-900 text-sm sm:text-base leading-relaxed font-semibold mb-6">
                  &ldquo;{review.quote}&rdquo;
                </p>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-playfair text-sm font-black text-gray-950">
                      {review.author}
                    </h4>
                    <p className="font-sans text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {review.role}
                    </p>
                  </div>
                  <span className="font-mono text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">
                    {review.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Call-to-Action to Leave feedback on JustDial */}
        <div className="mt-14 max-w-md mx-auto pt-4 text-center">
          <p className="font-sans text-[11px] text-gray-500 font-bold mb-3.5 italic">
            Trusted clinical success cases from JustDial & Google Reviews for Skin Hub, Ujjain.
          </p>
          <a
            href="https://www.justdial.com/Ujjain/Skin-Hub-Clinic"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 border border-teal-700 rounded-xl text-white font-sans font-bold text-xs hover:bg-teal-700 hover:shadow-lg transition-all cursor-pointer"
          >
            ⭐ Read More Verified Reviews
          </a>
        </div>

      </div>
    </section>
  );
}

/**
 * @file Services.tsx
 * @description Displays the core clinical services offered at Skin Hub. 
 * Maps through the centralized service configuration to render 
 * feature cards with pricing and descriptions.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Sparkles, Calendar, Syringe, Zap, Droplets, FlaskConical, ShieldCheck, ArrowRight } from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { CMSContent } from '@/lib/types';

interface ServicesProps {
  cms?: CMSContent | null;
}

// Map each service id to an icon
const iconMap: Record<string, React.ReactNode> = {
  acne:       <Syringe className="w-6 h-6" />,
  hair:       <Zap className="w-6 h-6" />,
  whitening:  <Droplets className="w-6 h-6" />,
  antiageing: <FlaskConical className="w-6 h-6" />,
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, rotateX: -30, z: -100 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    z: 0,
    transition: { delay: i * 0.12, duration: 0.6, type: "spring" as const, bounce: 0.2 },
  }),
};

export default function Services({ cms }: ServicesProps) {
  const servicesList = cms?.services || siteConfig.services;

  return (
    <section id="services" className="py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        <div className="mb-14">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Clinical Excellence
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Treatments We Specialise In
          </h2>
          <p className="font-sans text-gray-500 mt-3 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-semibold">
            Certified skin and hair procedures aligned with modern dermatology standards. 
            Available at <strong>Skin Hub, Freeganj, Ujjain</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left" style={{ perspective: '1000px' }}>
          {servicesList.map((svc, i) => (
            <motion.div
              key={svc.id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              whileHover={{ rotateX: 5, rotateY: -5, scale: 1.02, z: 20 }}
              viewport={{ once: true, margin: '-60px' }}
              variants={cardVariants}
              style={{ transformStyle: 'preserve-3d' }}
              className="group bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-accent hover:shadow-xl transition-colors duration-300 flex flex-col cursor-pointer"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                {iconMap[svc.id] ?? <ShieldCheck className="w-6 h-6" />}
              </div>

              <h3 className="font-playfair text-base font-bold text-gray-900 mb-2 leading-tight">
                {svc.name}
              </h3>
              <p className="font-sans text-xs text-gray-500 leading-relaxed flex-1 font-semibold">
                {svc.description}
              </p>

              {/* Price + CTA */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="font-sans text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {svc.price}
                </span>
                <Link
                  href="/booking"
                  className="inline-flex items-center text-xs font-bold text-accent hover:text-primary transition-colors"
                >
                  Book <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/services"
            className="inline-flex items-center px-6 py-3 border-2 border-primary text-primary font-sans font-bold text-sm rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
          >
            View All Treatments <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link
            href="/booking"
            className="inline-flex items-center px-6 py-3 bg-primary text-white font-sans font-bold text-sm rounded-xl hover:bg-accent hover:text-gray-900 transition-all duration-300"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Book Consultation
          </Link>
        </div>

      </div>
    </section>
  );
}

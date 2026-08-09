/**
 * @file About.tsx
 * @description Provides background information about Dr. Prateek Tiwari and Skin Hub. 
 * Highlights the specialist's philosophy, clinical authority, and core credentials.
 */

'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Sparkles, Calendar, Award, ShieldCheck, Users, Clock } from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { CMSContent } from '@/lib/types';

interface AboutProps {
  cms?: CMSContent | null;
}

const defaultStats = [
  { icon: <Clock className="w-5 h-5" />, value: '12+', label: 'Years Experience' },
  { icon: <Users className="w-5 h-5" />, value: '5,000+', label: 'Patients Treated' },
  { icon: <Award className="w-5 h-5" />, value: '4.9★', label: 'Google Rating' },
  { icon: <ShieldCheck className="w-5 h-5" />, value: '15+', label: 'Treatments' },
];

const defaultCredentials = [
  'MBBS — Bachelor of Medicine and Surgery',
  'DVD — Diploma in Venereology & Dermatology',
  'Specialist in PRP Hair Therapy & Chemical Peels',
  'Advanced Training in Aesthetic Cosmetology',
  'Registered Medical Practitioner, Madhya Pradesh',
];

export default function About({ cms }: AboutProps) {
  const doctorName = cms?.aboutTitle || siteConfig.doctorName;
  const credentialsText = cms?.aboutSubtitle || siteConfig.credentials;
  const aboutDescription = cms?.aboutDescription || "With over 12 years of dedicated practice in dermatology and cosmetology, Dr. Prateek Tiwari has helped thousands of patients across Ujjain and Madhya Pradesh achieve healthier skin and restored confidence. His patient-first philosophy combines evidence-based medicine with modern aesthetic science.";
  const doctorImage = cms?.aboutDoctorImage || "/assets/doctor.jpeg";

  const statsList = cms?.aboutStats?.map((s, idx) => ({
    icon: idx === 0 ? <Clock className="w-5 h-5" /> : idx === 1 ? <Users className="w-5 h-5" /> : idx === 2 ? <Award className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />,
    value: s.value,
    label: s.label
  })) || defaultStats;

  const credentialsList = cms?.aboutCredentials || defaultCredentials;

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — Doctor image with floating badge */}
          <motion.div
            initial={{ opacity: 0, rotateY: -20, z: -100, x: -40 }}
            whileInView={{ opacity: 1, rotateY: 0, z: 0, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            className="relative flex justify-center"
          >
            <div className="relative w-full max-w-[400px] aspect-[4/5] rounded-[36px] overflow-hidden shadow-[0_20px_50px_rgba(20,184,166,0.18)] border-[6px] border-white bg-slate-100 group">
              <Image
                src={doctorImage}
                alt={`${doctorName} — Best Dermatologist in Ujjain`}
                fill
                className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" />
            </div>
            {/* Floating credential card */}
            <div className="absolute -bottom-6 -right-4 sm:right-4 bg-white border border-gray-200 shadow-xl rounded-2xl p-4 max-w-[200px] z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-playfair text-sm font-bold text-gray-900 leading-none">MBBS, DVD</p>
                  <p className="font-sans text-[10px] text-gray-500 mt-0.5">Dermatologist</p>
                </div>
              </div>
              <p className="font-sans text-[10px] text-gray-500 border-t border-gray-100 pt-2">
                Ujjain's most trusted skin & hair specialist
              </p>
            </div>
          </motion.div>

          {/* Right — Content */}
          <motion.div
            initial={{ opacity: 0, rotateX: 20, y: 30 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.3, delay: 0.1 }}
            style={{ perspective: '1000px' }}
            className="space-y-7"
          >
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Meet Your Doctor
              </span>
              <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                {doctorName}
              </h2>
              <p className="font-sans text-accent font-bold text-sm mt-1">{credentialsText}</p>
            </div>

            <p className="font-sans text-gray-600 leading-relaxed text-sm sm:text-base">
              {aboutDescription}
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statsList.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                  className="bg-surface rounded-xl p-4 text-center border border-gray-200"
                >
                  <div className="flex justify-center text-primary mb-1">{s.icon}</div>
                  <p className="font-playfair text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="font-sans text-[10px] text-gray-500 font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Credentials list */}
            <ul className="space-y-2.5">
              {credentialsList.map((c, i) => (
                <li key={i} className="flex items-start gap-3 font-sans text-sm text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/booking"
                className="inline-flex items-center px-6 py-3 bg-primary hover:bg-accent hover:text-gray-900 text-white font-sans font-bold text-sm rounded-xl transition-all duration-300"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Consultation
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center px-6 py-3 border-2 border-primary text-primary font-sans font-bold text-sm rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
              >
                Read Full Profile
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

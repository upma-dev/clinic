'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  Award, 
  Calendar, 
  ShieldCheck, 
  Users, 
  Clock, 
  Sparkles, 
  BookOpen, 
  Heart, 
  CheckCircle, 
  X,
  Stethoscope,
  Scissors,
  Check
} from 'lucide-react';
import type { CMSContent } from '@/lib/types';
import { siteConfig } from '@/config/site';

interface DoctorProfileDetailProps {
  cms?: CMSContent | null;
}

export default function DoctorProfileDetail({ cms }: DoctorProfileDetailProps) {
  const doctorName = cms?.aboutTitle || siteConfig.doctorName;
  const credentialsText = cms?.aboutSubtitle || siteConfig.credentials;
  const doctorImage = cms?.aboutDoctorImage || "/assets/doctor.png";

  // Certificates list
  const defaultCertificates = [
    {
      id: 'c1',
      title: 'Board Certified in Dermatology',
      institution: 'IADVL (Indian Association of Dermatologists, Venereologists and Leprologists)',
      image: '/assets/cert1.png',
    },
    {
      id: 'c2',
      title: 'Advanced Cosmetology Fellowship',
      institution: 'International Skin Care Institute',
      image: '/assets/cert2.png',
    },
  ];

  const certificates = cms?.certificates && cms.certificates.length > 0
    ? cms.certificates
    : defaultCertificates;

  const [activeCertImage, setActiveCertImage] = useState<string | null>(null);

  const activeCert = activeCertImage
    ? certificates.find((c) => c.image === activeCertImage) ?? null
    : null;

  // Key Stats
  const stats = [
    { icon: <Clock className="w-6 h-6 text-primary" />, value: '12+', label: 'Years of Experience' },
    { icon: <Users className="w-6 h-6 text-primary" />, value: '10,000+', label: 'Happy Patients' },
    { icon: <Award className="w-6 h-6 text-primary" />, value: '4.8★', label: 'Google Rating' },
    { icon: <ShieldCheck className="w-6 h-6 text-primary" />, value: '100% Verified', label: 'Clinical Safety' },
  ];

  // Areas of Expertise
  const expertise = [
    {
      title: 'Clinical Dermatology',
      icon: <Stethoscope className="w-6 h-6 text-accent" />,
      description: 'Expert diagnosis and therapy for standard to complex medical dermatological disorders.',
      items: [
        'Cystic & Active Acne Treatment',
        'Acne Scars & Pigmentation',
        'Psoriasis & Chronic Eczema',
        'Vitiligo & Melasma Management',
        'Skin Allergies & Fungal Infections',
        'Pediatric Skin Consultation'
      ]
    },
    {
      title: 'Aesthetic Cosmetology',
      icon: <Sparkles className="w-6 h-6 text-accent" />,
      description: 'Non-surgical aesthetic enhancements designed to restore youthfulness and skin health.',
      items: [
        'Platelet-Rich Plasma (PRP) Therapy',
        'Advanced Chemical Yellow Peels',
        'Microneedling & Collagen Induction',
        'Anti-Ageing & Fine Line Correction',
        'Glutathione Skin Brightening',
        'Medical Hydrafacials & Skin Detoxing'
      ]
    },
    {
      title: 'Advanced Laser Procedures',
      icon: <ShieldCheck className="w-6 h-6 text-accent" />,
      description: 'US-FDA approved precision lasers targeting specific skin pigment and structure concerns.',
      items: [
        'Permanent Laser Hair Reduction',
        'Acne Scar Resurfacing',
        'Q-Switched Laser Tattoo Removal',
        'Carbon Laser Peel (Hollywood Peel)',
        'Skin Photo-Rejuvenation',
        'Birthmark & Mole Removal'
      ]
    },
    {
      title: 'Trichology & Hair Restoration',
      icon: <Scissors className="w-6 h-6 text-accent" />,
      description: 'Scientific and clinically proven hair regrowth and scalp health restoration models.',
      items: [
        'Male & Female Pattern Thinning',
        'PRP Hair Regrowth Therapy',
        'Scalp Psoriasis & Dandruff Care',
        'Alopecia Areata Solutions',
        'Hair Follicle Nourishment',
        'Growth Factor Growth Infusion'
      ]
    }
  ];

  // Academic Timeline
  const qualifications = [
    {
      year: 'Post-Graduation',
      title: 'DVD — Diploma in Venereology & Dermatology',
      detail: 'Specialized training program focused on advanced clinical dermatology, venereal diseases, and aesthetic lasers. Obtained in-depth understanding of skin pathology and cosmetic science.',
    },
    {
      year: 'Graduation',
      title: 'MBBS — Bachelor of Medicine, Bachelor of Surgery',
      detail: 'Comprehensive medical education establishing a solid scientific foundation in medicine, pharmacology, surgery, and patient diagnostics.',
    },
    {
      year: 'Fellowships & Training',
      title: 'Advanced Aesthetics & Laser Practitioner',
      detail: 'Hands-on clinical training in advanced laser technologies (Q-Switched Nd:YAG, Diode lasers) and chemical yellow peels, certified for aesthetic medicine practices.',
    }
  ];

  return (
    <div className="bg-white select-text">
      
      {/* 1. Profile Header / Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-surface via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Doctor Portrait */}
            <div className="lg:col-span-5 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[380px] aspect-[4/5] rounded-[32px] overflow-hidden shadow-xl border-4 border-white bg-slate-100"
              >
                <Image
                  src={doctorImage}
                  alt={`${doctorName} — Founder & Dermatologist`}
                  fill
                  priority
                  className="object-cover object-center scale-[1.1] translate-y-[2%]"
                  sizes="(max-width: 1024px) 100vw, 380px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg text-center border border-gray-100">
                  <span className="text-primary font-sans text-xs font-extrabold uppercase tracking-widest block mb-0.5">REGISTERED PRACTITIONER</span>
                  <span className="text-gray-700 text-xs font-semibold">Madhya Pradesh Medical Council</span>
                </div>
              </motion.div>
            </div>

            {/* Right: Intro Details */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Chief Dermatologist
              </span>
              <h1 className="font-playfair text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {doctorName}
              </h1>
              <p className="font-sans text-accent text-lg font-bold">
                {credentialsText}
              </p>
              
              <div className="h-0.5 w-20 bg-primary/30" />
              
              <p className="font-sans text-gray-600 text-base sm:text-lg leading-relaxed">
                With over a decade of rich experience in medical dermatology and aesthetic medicine, Dr. Prateek Tiwari is a leading authority in skin, hair, and laser treatments in Ujjain. He is dedicated to helping patients achieve optimal skin health and renewed confidence through customized, science-backed care protocols.
              </p>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {stats.map((s, idx) => (
                  <div key={idx} className="bg-surface rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center">
                    <div className="mb-2">{s.icon}</div>
                    <span className="font-playfair text-xl font-bold text-gray-900">{s.value}</span>
                    <span className="font-sans text-[10px] text-gray-500 font-bold uppercase tracking-wide mt-1">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Biography & Clinical Philosophy */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
              <span className="inline-flex items-center text-primary font-sans text-xs font-bold uppercase tracking-wider mb-2">
                <Heart className="w-4 h-4 mr-1 text-accent" />
                Clinical Philosophy
              </span>
              <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gray-900">
                Patient-Centric Skincare
              </h2>
            </div>
            
            <div className="font-sans text-gray-600 text-base leading-relaxed space-y-6">
              <p>
                At Skin Hub, we believe that healthy skin is the foundation of self-confidence. Dr. Prateek Tiwari’s journey began with a vision to bring world-class dermatological science and cosmetic innovations to the community of Ujjain, Madhya Pradesh. By blending advanced medical insights with standard patient care, he has established a trust-based relationship with over 10,000 satisfied patients.
              </p>
              <p>
                Every treatment plan is bespoke. Dr. Tiwari believes in understanding the underlying clinical cause of skin and hair conditions rather than merely treating the surface symptoms. Whether managing chronic conditions like eczema and psoriasis, or performing high-precision aesthetic treatments like yellow peels and lasers, patient safety, safety standards, and natural results remain the absolute priority.
              </p>
            </div>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
                <h4 className="font-playfair font-bold text-gray-900 text-base mb-2">Evidence-Based Medicine</h4>
                <p className="font-sans text-xs text-gray-500 leading-relaxed">Every treatment is backed by robust scientific clinical studies, ensuring safe and effective results.</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
                <h4 className="font-playfair font-bold text-gray-900 text-base mb-2">US-FDA Approved Equipment</h4>
                <p className="font-sans text-xs text-gray-500 leading-relaxed">We utilize gold-standard lasers and devices that conform to international safety protocols.</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
                <h4 className="font-playfair font-bold text-gray-900 text-base mb-2">Complete Transparency</h4>
                <p className="font-sans text-xs text-gray-500 leading-relaxed">We explain the diagnostic details, session requirements, costs, and timeline upfront.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Specialized Treatments & Core Expertise */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-4">
              <Stethoscope className="w-3.5 h-3.5 mr-1" />
              Specialization Details
            </span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Clinical Specializations & Treatments
            </h2>
            <p className="mt-4 font-sans text-sm sm:text-base text-gray-500">
              Dr. Prateek Tiwari provides comprehensive skin, hair, and cosmetic therapies using advanced medical methodologies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {expertise.map((exp, idx) => (
              <div key={idx} className="bg-white border border-gray-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      {exp.icon}
                    </div>
                    <h3 className="font-playfair font-black text-xl text-gray-900">{exp.title}</h3>
                  </div>
                  <p className="font-sans text-sm text-gray-600 mb-6 leading-relaxed">
                    {exp.description}
                  </p>
                  
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exp.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2.5 font-sans text-xs text-gray-600">
                        <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Education & Qualifications Timeline */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-4">
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              Academic Milestones
            </span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Educational & Professional Background
            </h2>
          </div>

          <div className="max-w-3xl mx-auto relative border-l-2 border-primary/20 pl-8 ml-4 md:ml-auto">
            {qualifications.map((q, idx) => (
              <div key={idx} className="mb-12 relative last:mb-0">
                {/* Timeline Dot */}
                <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full border-4 border-white bg-primary shadow-sm flex items-center justify-center z-10" />
                
                <span className="inline-block px-3 py-0.5 rounded-full bg-accent/15 text-accent font-sans text-[10px] font-bold tracking-widest uppercase mb-2">
                  {q.year}
                </span>
                
                <h3 className="font-playfair font-black text-xl text-gray-900 mb-2">
                  {q.title}
                </h3>
                
                <p className="font-sans text-sm text-gray-600 leading-relaxed">
                  {q.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Certificates & Verification Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-4">
              <Award className="w-3.5 h-3.5 mr-1" />
              Verified Board Certifications
            </span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Recognized Board Certifications
            </h2>
            <p className="mt-4 font-sans text-sm text-gray-600">
              Dr. Prateek Tiwari is fully board-certified, maintaining memberships and certifications under leading clinical boards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {certificates.map((cert) => (
              <button
                key={cert.id}
                type="button"
                onClick={() => setActiveCertImage(cert.image)}
                className="text-left bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex items-center space-x-6 hover:shadow-md transition-shadow group"
                aria-label={`Open certificate image: ${cert.title}`}
              >
                <div className="w-24 h-24 bg-gray-100 rounded-xl border border-gray-200 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                  <span className="absolute font-bold text-gray-300 text-[10px] uppercase tracking-widest text-center whitespace-nowrap -rotate-45">CERT IMAGE</span>
                  <img
                    src={cert.image}
                    alt={cert.title}
                    className="w-full h-full object-contain relative z-10"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-playfair font-black text-lg text-gray-900 mb-1 group-hover:text-primary transition-colors">
                    {cert.title}
                  </h3>
                  <p className="font-sans text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                    {cert.institution}
                  </p>
                  <div className="mt-3 inline-flex items-center text-green-700 text-[10px] font-bold bg-green-50 px-2 py-1 rounded">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Verified Credentials
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Lightbox Modal */}
          {activeCertImage && activeCert && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => setActiveCertImage(null)}
            >
              <div
                className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setActiveCertImage(null)}
                  className="absolute top-3 right-3 z-[70] w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center shadow-sm"
                >
                  <X className="w-4 h-4 text-gray-900" />
                </button>

                <div className="p-5 border-b border-gray-100">
                  <h4 className="font-playfair text-lg font-black text-gray-900">{activeCert.title}</h4>
                  <p className="font-sans text-xs text-gray-600 font-bold uppercase tracking-widest">{activeCert.institution}</p>
                </div>

                <div className="bg-gray-50 p-4">
                  <img
                    src={activeCert.image}
                    alt={activeCert.title}
                    className="w-full h-auto object-contain max-h-[70vh] mx-auto rounded-lg shadow-inner"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. CTA / Booking Section */}
      <section className="py-16 bg-gradient-to-t from-surface to-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-primary text-white rounded-[32px] p-8 sm:p-12 shadow-xl relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 space-y-6">
              <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold tracking-tight">
                Restore Your Skin & Hair Confidence
              </h2>
              <p className="font-sans text-sm sm:text-base text-gray-100 max-w-xl mx-auto leading-relaxed">
                Consult with Dr. Prateek Tiwari at Rishi Nagar, Ujjain. Walk-in appointments or online telemedicine consultations are available.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center pt-2">
                <Link
                  href="/booking"
                  className="inline-flex items-center px-8 py-4 bg-accent text-gray-900 font-sans font-extrabold text-sm rounded-xl hover:bg-white hover:text-primary transition-all duration-300 shadow-md"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment Now
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center px-8 py-4 border border-white/30 text-white hover:bg-white hover:text-primary font-sans font-extrabold text-sm rounded-xl transition-all duration-300"
                >
                  Get Directions & Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

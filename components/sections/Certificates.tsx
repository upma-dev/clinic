'use client';

import React, { useState } from 'react';
import { Award, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CMSContent } from '@/lib/types';

interface CertificatesProps {
  cms?: CMSContent | null;
}

export default function Certificates({ cms }: CertificatesProps) {
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
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? certificates.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === certificates.length - 1 ? 0 : prev + 1));
  };

  const certIndex = currentIndex >= certificates.length ? 0 : currentIndex;
  const currentCert = certificates[certIndex];

  const activeCert = activeCertImage
    ? certificates.find((c) => c.image === activeCertImage) ?? null
    : null;

  return (
    <section className="py-6 sm:py-12 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-4">
            <Award className="w-3.5 h-3.5 mr-1" />
            Credentials & Certifications
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Recognized Clinical Excellence
          </h2>
          <p className="mt-4 font-sans text-sm sm:text-base text-gray-700 font-semibold">
            Our treatments are backed by verified board certifications and advanced fellowships, guaranteeing the highest standard of patient care.
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto px-2 sm:px-0">
          <div className="relative flex items-center">
            {certificates.length > 1 && (
              <button
                type="button"
                onClick={prevSlide}
                className="absolute -left-2 sm:-left-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full border border-gray-200 bg-white/90 backdrop-blur-sm hover:bg-white transition-all shadow-md hover:shadow-lg focus:outline-none shrink-0 active:scale-95 cursor-pointer"
                aria-label="Previous certificate"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
            )}

            <div className="w-full overflow-hidden py-2 px-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={certIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveCertImage(currentCert.image)}
                    className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row items-center text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6 hover:shadow-md transition-shadow group cursor-pointer"
                    aria-label={`Open certificate image: ${currentCert.title}`}
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 rounded-xl border border-gray-200 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                      <span className="absolute font-bold text-gray-300 text-[10px] uppercase tracking-widest text-center whitespace-nowrap -rotate-45">CERT IMAGE</span>
                      <img
                        src={currentCert.image}
                        alt={currentCert.title}
                        className="w-full h-full object-contain relative z-10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-playfair font-black text-base sm:text-lg text-gray-900 mb-1.5 group-hover:text-[#1B4F72] transition-colors whitespace-normal break-words leading-snug">
                        {currentCert.title}
                      </h3>
                      <p className="font-sans text-xs sm:text-xs text-gray-600 font-bold uppercase tracking-wider leading-relaxed whitespace-normal break-words">
                        {currentCert.institution}
                      </p>
                      <div className="mt-3 inline-flex items-center text-green-700 text-xs font-bold bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Verified
                      </div>
                    </div>
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

            {certificates.length > 1 && (
              <button
                type="button"
                onClick={nextSlide}
                className="absolute -right-2 sm:-right-6 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full border border-gray-200 bg-white/90 backdrop-blur-sm hover:bg-white transition-all shadow-md hover:shadow-lg focus:outline-none shrink-0 active:scale-95 cursor-pointer"
                aria-label="Next certificate"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>

          {/* Dots Indicator */}
          {certificates.length > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              {certificates.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    certIndex === idx ? 'w-8 bg-[#1B4F72]' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to certificate ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Image Lightbox */}
        {activeCertImage && activeCert && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setActiveCertImage(null)}
          >
            <div
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActiveCertImage(null)}
                className="absolute top-3 right-3 z-[70] w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-900" />
              </button>

              <div className="p-5 border-b border-gray-100">
                <h4 className="font-playfair text-lg font-black text-gray-900">{activeCert.title}</h4>
                <p className="font-sans text-xs text-gray-600 font-bold uppercase tracking-widest">{activeCert.institution}</p>
              </div>

              <div className="bg-gray-50">
                <img
                  src={activeCert.image}
                  alt={activeCert.title}
                  className="w-full h-auto object-contain max-h-[70vh] mx-auto"
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
  );
}


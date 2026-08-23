'use client';

import React, { useState } from 'react';
import { Award, CheckCircle, X } from 'lucide-react';

export default function Certificates() {
  const certificates = [
    {
      id: 1,
      title: 'Board Certified in Dermatology',
      institution: 'IADVL',
      image: '/assets/cert1.png',
    },
    {
      id: 2,
      title: 'Advanced Cosmetology Fellowship',
      institution: 'International Skin Care Institute',
      image: '/assets/cert2.png',
    },
  ];

  const [activeCertImage, setActiveCertImage] = useState<string | null>(null);


  const activeCert = activeCertImage
    ? certificates.find((c) => c.image === activeCertImage) ?? null
    : null;

  return (
    <section className="py-20 bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-3xl mx-auto mb-16">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {certificates.map((cert) => (
            <button
              key={cert.id}
              type="button"
              onClick={() => setActiveCertImage(cert.image)}
              className="text-left bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center space-x-6 hover:shadow-md transition-shadow group"
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
                <h3 className="font-playfair font-black text-lg text-gray-900 mb-1 group-hover:text-[#1B4F72] transition-colors">
                  {cert.title}
                </h3>
                <p className="font-sans text-xs text-gray-600 font-bold uppercase tracking-widest">
                  {cert.institution}
                </p>
                <div className="mt-3 inline-flex items-center text-green-700 text-xs font-bold bg-green-50 px-2 py-1 rounded">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Verified
                </div>
              </div>
            </button>
          ))}
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


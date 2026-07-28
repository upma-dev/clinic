'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import type { CMSContent } from '@/lib/types';

interface GalleryProps {
  cms?: CMSContent | null;
}

const defaultGalleryItems = [
  {
    title: 'Active Acne Peeling',
    desc: 'Clearing stubborn pimple cycles and balancing sebaceous sebum.',
    img: '/assets/result1.jpeg',
  },
  {
    title: 'Centrifugal PRP Therapy',
    desc: 'Stimulating dormant root follicles using autologous growth factors.',
    img: '/assets/result2.jpeg',
  },
  {
    title: 'Glutathione Radiance',
    desc: 'Rebalancing hyperpigmentation, chemical yellow peels, and custom sunscreens.',
    img: '/assets/reult3.jpeg',
  },
];

export default function Gallery({ cms }: GalleryProps) {
  const pathname = usePathname();
  const showViewAll = pathname === '/';

  const galleryList = cms?.gallery?.map(g => ({
    title: g.title,
    desc: `${g.category} Treatment Insight`,
    img: g.imageUrl
  })) || defaultGalleryItems;

  return (
    <section id="gallery" className="py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-14">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Procedure Dossier
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Advanced Clinical Insights
          </h2>
          <p className="font-sans text-gray-600 mt-2 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-semibold">
            Visual walkthroughs of key dermal, scalp, and cosmetology treatments conducted at our Freeganj office.
          </p>

          {showViewAll && (
            <div className="mt-8">
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-accent transition-colors shadow-xs"
              >
                View all gallery
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-10" style={{ perspective: '1000px' }}>
          {galleryList.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotateX: 15, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.15, duration: 0.7, type: 'spring', bounce: 0.3 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md group hover:border-accent hover:shadow-xl transition-all"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Image
                  src={item.img}
                  alt={`${item.title} - Skin Hub Clinic Ujjain`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <div className="p-6 text-left space-y-2">
                <h4 className="font-playfair text-lg font-bold text-gray-900">{item.title}</h4>
                <p className="font-sans text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Sparkles, Instagram } from 'lucide-react';
import { siteConfig } from '@/config/site';

export default function VideoSection() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const videoTutorials = [
    {
      id: 'prp-tutorial',
      title: 'How PRP Hair Therapy is Conducted',
      desc: 'Inside our specialized clinic: Step-by-step preparation, blood centrifugation, and nutrient growth factor micro-deliveries.',
      duration: '3 mins walkthrough',
      videoUrl: '/assets/dummy_video.mp4',
      thumbnail: '/assets/placeholder2.jpeg',
    },
    {
      id: 'acne-peel-tutorial',
      title: 'Chemical Peels vs Melasma Care',
      desc: 'Dr. Prateek Tiwari explaining salicylic & glycolic peeling controls. Witness skin-cell turnover for radiant health.',
      duration: '4 mins clinical talk',
      videoUrl: '/assets/Video2.mp4',
      thumbnail: '/assets/placeholder1.jpeg',
    },
  ];

  return (
    <section
      id="video-section"
      className="border-t border-gray-200 bg-[#F9F9FB] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-sans text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Media & Walkthroughs
          </span>

          <h2 className="font-playfair text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Clinic Walkthrough & Procedures
          </h2>

          <p className="mx-auto mt-3 max-w-2xl font-sans text-sm font-semibold leading-relaxed text-gray-700 sm:text-base">
            Watch Dr. Prateek Tiwari explain treatment pathways. Follow us on
            Instagram for regular clinical progress cards, patient stories, and
            discount coupons in Ujjain!
          </p>

          <div className="mt-5 flex justify-center">
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex cursor-pointer items-center rounded-full bg-primary hover:bg-primary-light px-5 py-2.5 font-sans text-xs font-black text-white shadow-md transition-all hover:scale-105 sm:text-sm"
            >
              <div className="relative mr-2 flex h-5 w-5 items-center justify-center rounded-[6px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1px]">
                <div className="flex h-full w-full items-center justify-center rounded-[5px] bg-primary group-hover:bg-primary-light transition-colors">
                  <Instagram className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              Follow @skinhub_ujjain on Instagram
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 text-left md:grid-cols-2">
          {videoTutorials.map((vid) => {
            const isActive = activeVideo === vid.id;

            return (
              <article
                key={vid.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Video area */}
                <div className="relative h-[280px] w-full overflow-hidden bg-[#0d1721] sm:h-[360px] md:h-[320px] lg:h-[360px]">
                  {/* Blurred background image */}
                  <Image
                    src={vid.thumbnail}
                    alt=""
                    fill
                    aria-hidden="true"
                    className="scale-110 object-cover opacity-35 blur-xl"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />

                  {/* Main thumbnail */}
                  {!isActive && (
                    <>
                      <Image
                        src={vid.thumbnail}
                        alt={vid.title}
                        fill
                        className="object-contain object-center"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />

                      {/* Soft dark overlay */}
                      <div className="absolute inset-0 bg-black/15" />

                      <button
                        type="button"
                        onClick={() => setActiveVideo(vid.id)}
                        aria-label={`Play ${vid.title}`}
                        className="absolute inset-0 z-20 flex items-center justify-center"
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d9b545] text-gray-900 shadow-xl transition-transform hover:scale-110 sm:h-18 sm:w-18">
                          <Play className="ml-1 h-7 w-7 fill-current" />
                        </span>
                      </button>

                      <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        Click to play
                      </div>
                    </>
                  )}

                  {/* Actual video */}
                  {isActive && (
                    <>
                      <video
                        className="absolute inset-0 z-10 h-full w-full object-contain"
                        src={vid.videoUrl}
                        controls
                        playsInline
                        autoPlay
                        preload="metadata"
                      />

                      <button
                        type="button"
                        onClick={() => setActiveVideo(null)}
                        className="absolute right-3 top-3 z-30 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-black"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>

                {/* Text */}
                <div className="space-y-3 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
                      Procedure Guide
                    </span>

                    <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 font-sans text-[11px] font-bold text-gray-700">
                      {vid.duration}
                    </span>
                  </div>

                  <h3 className="font-playfair text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                    {vid.title}
                  </h3>

                  <p className="font-sans text-sm font-medium leading-relaxed text-gray-600">
                    {vid.desc}
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveVideo(vid.id)}
                    className="inline-flex items-center gap-2 pt-1 text-sm font-bold text-primary transition hover:underline"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {isActive ? 'Video Playing' : 'Watch Video'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
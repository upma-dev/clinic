'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, User, ArrowLeft, Share2, Printer, CheckCircle, BookOpen, Eye } from 'lucide-react';
import type { BlogPost, ClinicSettings, CMSContent } from '@/lib/types';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';

interface BlogDetailClientProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
  recentPosts: BlogPost[];
  popularPosts: BlogPost[];
  settings: ClinicSettings | null;
  cms: CMSContent | null;
}

export default function BlogDetailClient({
  post,
  relatedPosts,
  recentPosts,
  popularPosts,
  settings,
  cms,
}: BlogDetailClientProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF9] flex flex-col justify-between select-text">
      <Navbar settings={settings} cms={cms} />

      <div className="pt-28 pb-20 px-4 max-w-7xl mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
        
        {/* Main Content Column */}
        <article className="lg:col-span-8 space-y-6">
          
          {/* Back button */}
          <div>
            <Link
              href="/blog"
              className="inline-flex items-center text-xs font-sans font-extrabold text-[#1B4F72] hover:text-accent cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
              Back to Skin Library
            </Link>
          </div>

          {/* Title Area */}
          <div className="space-y-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded bg-teal-50 border border-teal-100 text-teal-850 text-[10px] font-sans font-extrabold uppercase tracking-wider">
              {post.category}
            </span>
            <h1 className="font-playfair text-3xl sm:text-4.5xl font-black text-gray-900 leading-tight tracking-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5 pt-1">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-sans font-semibold text-gray-500">
                <span className="flex items-center text-gray-900 font-bold">
                  <User className="w-4 h-4 mr-1.5 text-primary" />
                  By {post.author}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 text-primary" />
                  {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-primary" />
                  {post.readTime}
                </span>
                <span className="flex items-center">
                  <Eye className="w-4 h-4 mr-1.5 text-primary" />
                  {post.views || 0} views
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyLink}
                  className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors shadow-xs cursor-pointer inline-flex items-center outline-none"
                  title="Share Article Link"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-600 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider">{copied ? 'Copied' : 'Share'}</span>
                </button>
                <button
                  onClick={() => typeof window !== 'undefined' && window.print()}
                  className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all shadow-xs cursor-pointer outline-none"
                  title="Print Article"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          {post.imageUrl && (
            <div className="w-full h-64 sm:h-96 relative rounded-2xl overflow-hidden border border-gray-300 shadow-md shrink-0 bg-gray-100">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://picsum.photos/seed/skinwellness/1200/800";
                }}
              />
            </div>
          )}

          {/* Summary Block */}
          <div className="bg-[#F8F6F2] border-l-4 border-accent rounded-r-xl p-5 sm:p-6 font-sans">
            <p className="text-gray-900 font-bold leading-relaxed text-sm sm:text-base italic">
              &ldquo;{post.summary}&rdquo;
            </p>
          </div>

          {/* Markdown Content */}
          <div className="font-sans text-stone-900 text-sm sm:text-base leading-relaxed space-y-6 max-w-3xl font-semibold">
            {post.content.split('\n\n').map((paragraph: string, idx: number) => {
              if (paragraph.startsWith('* ') || paragraph.startsWith('### ')) {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={idx} className="font-playfair text-xl sm:text-2xl font-black text-gray-950 pt-4 pb-1">
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                }
                const listLines = paragraph.split('\n');
                return (
                  <ul key={idx} className="list-disc pl-5 space-y-2 mt-2 font-semibold">
                    {listLines.map((liLine, lIdx) => (
                      <li key={lIdx} className="text-stone-850">
                        {liLine.replace('* ', '').replace(/^\d+\.\s+/, '')}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="whitespace-pre-wrap text-stone-850">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Author Block */}
          <div className="pt-8 border-t border-gray-250 bg-white p-6 sm:p-8 rounded-2xl border border-gray-300 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 text-primary font-serif font-black text-2.5xl flex items-center justify-center shrink-0">
              {post.author.charAt(0) || "D"}
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-playfair text-base sm:text-lg font-black text-gray-900">
                Approved and Compiled by {post.author}
              </h4>
              <p className="font-sans text-xs text-gray-500 font-bold uppercase tracking-widest">
                Senior Consultant Dermatologist & Cosmetologist
              </p>
              <p className="font-sans text-[11px] sm:text-xs text-gray-800 leading-normal font-semibold pt-1">
                Provides advanced therapies including chemical peels, hair loss restoration, acne scars laser reductions, and aesthetic treatments.
              </p>
            </div>
          </div>

        </article>

        {/* Sidebar Widgets Column */}
        <aside className="lg:col-span-4 space-y-8 font-sans">
          
          {/* Related Blogs Widget */}
          {relatedPosts.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-gray-900 border-b pb-2 flex items-center gap-2 uppercase tracking-wide">
                <BookOpen className="w-4 h-4 text-primary" />
                Related Articles
              </h3>
              <div className="space-y-3">
                {relatedPosts.map(p => (
                  <Link key={p.id} href={`/blog/${p.id}`} className="block group">
                    <h4 className="font-bold text-xs text-gray-800 group-hover:text-primary transition-colors line-clamp-2">
                      {p.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Popular Blogs Widget */}
          {popularPosts.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-gray-900 border-b pb-2 flex items-center gap-2 uppercase tracking-wide">
                <Eye className="w-4 h-4 text-teal-600" />
                Trending Guides
              </h3>
              <div className="space-y-3">
                {popularPosts.map(p => (
                  <Link key={p.id} href={`/blog/${p.id}`} className="block group">
                    <h4 className="font-bold text-xs text-gray-800 group-hover:text-primary transition-colors line-clamp-2">
                      {p.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                      {p.views || 0} views • {p.readTime}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Blogs Widget */}
          {recentPosts.length > 0 && (
            <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-gray-900 border-b pb-2 flex items-center gap-2 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-primary" />
                Latest Publications
              </h3>
              <div className="space-y-3">
                {recentPosts.map(p => (
                  <Link key={p.id} href={`/blog/${p.id}`} className="block group">
                    <h4 className="font-bold text-xs text-gray-800 group-hover:text-primary transition-colors line-clamp-2">
                      {p.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-1 font-semibold">
                      Category: {p.category}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </aside>

      </div>

      <Footer settings={settings} cms={cms} />
    </div>
  );
}

/**
 * @file Blog.tsx
 * @description Renders the latest clinical blog posts on the home page. 
 * Fetches data from the /api/blogs endpoint and displays them in a 
 * responsive grid with skeleton loading states.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Calendar, User, Clock } from 'lucide-react';

interface BlogSectionProps {
  cms?: any;
}

export default function BlogSection({ cms }: BlogSectionProps = {}) {
  // State for dynamic publications data
  const [blogs, setBlogs] = useState<any[]>([]);
  // State to manage early loading lifecycle
  const [loading, setLoading] = useState(true);

  // Fetch blogs on component mount
  useEffect(() => {
    async function fetchBlogs() {
      try {
        const res = await fetch('/api/blogs');
        if (res.ok) {
          const data = await res.json();
          // Extract posts array (API returns { posts: [...], total: ... })
          const postsList = Array.isArray(data) ? data : (data.posts || []);
          // Take top 3 latest publications for home page featured section
          setBlogs(postsList.slice(0, 3));
        }
      } catch (err) {
        console.error("Blog fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBlogs();
  }, []);

  return (
    <section id="blogs" className="py-20 bg-stone-50 text-left border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Descriptive Section Header for SEO and Accessibility */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
              📚 Skin Hub Health Articles
            </span>
            <h2 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-none">
              Dermatology & Aesthetic Insights
            </h2>
            <p className="font-sans text-gray-800 mt-2 text-xs sm:text-sm font-bold max-w-xl leading-relaxed">
              Medical knowledge simplified by Dr. Prateek Tiwari. Read about advanced chemical peels, hair growth cycles, and skincare routines.
            </p>
          </div>
          
          {/* Link to the full dedicated blog index */}
          <Link
            href="/blog"
            className="inline-flex items-center text-xs font-sans font-bold text-[#1B4F72] border border-gray-300 rounded-lg bg-white px-4 py-2 hover:bg-gray-50 focus:outline-hidden transition-all shadow-xs shrink-0 cursor-pointer w-fit"
          >
            Read All Articles
            <ArrowRight className="w-4 h-4 ml-2 text-[#1B4F72]" />
          </Link>
        </div>

        {/* Dynamic Display Logic: Skeleton -> Empty State -> Grid Feed */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="w-1/3 h-5 bg-gray-200 rounded" />
                <div className="w-full h-8 bg-gray-200 rounded" />
                <div className="w-2/3 h-4 bg-gray-205 rounded" />
                <div className="w-full h-40 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-sans text-xs font-bold leading-normal border-2 border-dashed border-gray-200 rounded-2xl bg-white max-w-lg mx-auto">
            📭 Temporary offline clinical publications feed or cache reload ongoing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map((post) => (
              <article
                key={post.id}
                className="bg-white border border-gray-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all hover:border-[#1B4F72] flex flex-col h-full transform hover:-translate-y-1 duration-200"
              >
                {/* Featured Visual Port: contains category tag mask */}
                <div className="h-48 w-full bg-gray-200 relative overflow-hidden">
                  <img
                    src={post.imageUrl || `https://picsum.photos/seed/${post.id}/800/500`}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "https://picsum.photos/seed/skinclinic/800/500";
                    }}
                  />
                  <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs border border-teal-150 text-teal-800 text-[10px] font-sans font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-xs">
                    {post.category}
                  </span>
                </div>

                {/* Information Payload area */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Metadata line (Date and Time Estimate) */}
                    <div className="flex items-center space-x-4 font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-primary" />
                        {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-primary" />
                        {post.readTime}
                      </span>
                    </div>

                    {/* Title with line-clamping and hover triggers */}
                    <h3 className="font-playfair text-base sm:text-lg font-black text-gray-900 leading-snug">
                      <Link href={`/blog/${post.id}`} className="hover:text-[#1B4F72] transition-colors line-clamp-2">
                        {post.title}
                      </Link>
                    </h3>

                    {/* Short summary for quick scannability */}
                    <p className="font-sans text-xs sm:text-sm text-gray-650 leading-relaxed font-semibold line-clamp-3">
                      {post.summary}
                    </p>
                  </div>

                  {/* Foot metadata and read action */}
                  <div className="pt-5 border-t border-gray-100 mt-5 flex items-center justify-between text-xs font-sans font-bold text-[#1B4F72]">
                    <span className="flex items-center text-gray-500 font-medium">
                      <User className="w-3.5 h-3.5 mr-1 text-primary" />
                      By {post.author}
                    </span>
                    <Link
                      href={`/blog/${post.id}`}
                      className="inline-flex items-center hover:text-accent transform hover:translate-x-1 duration-200 cursor-pointer"
                    >
                      Read Full Article
                      <ArrowRight className="w-3.5 h-3.5 ml-1 text-accent" />
                    </Link>
                  </div>

                </div>
              </article>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}


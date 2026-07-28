'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, User, ArrowRight, BookOpen, Search } from 'lucide-react';
import type { BlogPost, ClinicSettings, CMSContent } from '@/lib/types';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';

interface BlogListingClientProps {
  initialPosts: BlogPost[];
  initialTotal: number;
  settings: ClinicSettings | null;
  cms: CMSContent | null;
}

export default function BlogListingClient({ initialPosts, initialTotal, settings, cms }: BlogListingClientProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);

  const categories = ['All', 'Aesthetic Care', 'Hair Restoration', 'Clinical Dermatology', 'Laser Care'];

  useEffect(() => {
    // Skip initial fetch on first render
    if (searchTerm === '' && selectedCategory === 'All' && page === 1) {
      return;
    }

    setLoading(true);
    const query = new URLSearchParams({
      search: searchTerm,
      category: selectedCategory,
      page: page.toString(),
      limit: '9'
    });

    fetch(`/api/blogs?${query.toString()}`)
      .then(r => r.ok ? r.json() : { posts: [], total: 0 })
      .then(data => {
        setBlogs(data.posts || []);
        setTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchTerm, selectedCategory, page]);

  return (
    <div className="min-h-screen bg-[#FCFBF9] flex flex-col justify-between select-text">
      <Navbar settings={settings} cms={cms} />

      <div className="pt-28 pb-20 px-4 max-w-7xl mx-auto w-full flex-1 text-left select-text">
        
        {/* Editorial Heading */}
        <div className="border-b border-gray-250 pb-8 mb-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-100 border border-teal-200 text-teal-800 font-sans text-xs font-bold uppercase tracking-wider mb-3">
            📖 Skin Hub Clinical Library
          </span>
          <h1 className="font-playfair text-3.5xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Skin & Hair Care Journals
          </h1>
          <p className="font-sans text-gray-800 mt-2 text-xs sm:text-sm font-bold max-w-2xl leading-relaxed">
            Clinical insights and dermatological instructions prepared specifically to help you maintain glowing, safe, and robust skin.
          </p>
        </div>

        {/* Filters and search panel */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 font-sans">
          
          {/* Categories Selector */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setPage(1); }}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1B4F72] border-[#1B4F72] text-white shadow-xs'
                    : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative max-w-sm w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search dermatology topics..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:border-[#1B4F72] font-semibold outline-none"
            />
          </div>

        </div>

        {/* Listings Container Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="bg-white border border-gray-250 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="w-1/3 h-5 bg-gray-200 rounded" />
                <div className="w-full h-8 bg-gray-200 rounded" />
                <div className="w-full h-40 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl p-8 max-w-md mx-auto">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-playfair text-lg font-bold text-gray-900">No Articles Matched</h3>
            <p className="font-sans text-xs text-gray-800 leading-normal mt-1 font-semibold">
              Try adjusting your search query or category selectors to find active publications.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((post) => (
                <article
                  key={post.id}
                  className="bg-white border border-gray-300 rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:border-[#1B4F72] flex flex-col h-full transform hover:-translate-y-1 duration-200"
                >
                  {/* Image */}
                  <div className="h-48 bg-gray-100 relative overflow-hidden shrink-0">
                    <img
                      src={post.imageUrl || `https://picsum.photos/seed/${post.id}/800/500`}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "https://picsum.photos/seed/skinwellness/800/500";
                      }}
                    />
                    <span className="absolute top-4 left-4 bg-white/95 border border-teal-150 text-teal-850 text-[10px] font-sans font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                      {post.category}
                    </span>
                  </div>

                  {/* Info and action */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3.5 font-mono text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {post.readTime}
                        </span>
                      </div>

                      <h3 className="font-playfair text-base sm:text-lg font-bold text-gray-900 leading-snug hover:text-[#1B4F72]">
                        <Link href={`/blog/${post.id}`}>
                          {post.title}
                        </Link>
                      </h3>

                      <p className="font-sans text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold line-clamp-3">
                        {post.summary}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-gray-100 mt-5 flex items-center justify-between text-xs font-sans font-bold text-[#1B4F72]">
                      <span className="flex items-center text-gray-500">
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

            {/* Pagination Controls */}
            {total > 9 && (
              <div className="flex justify-center items-center gap-4 pt-6 border-t font-sans">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white text-gray-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-gray-500">Page {page} of {Math.ceil(total / 9)}</span>
                <button
                  disabled={page * 9 >= total}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold bg-white text-gray-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      <Footer settings={settings} cms={cms} />
    </div>
  );
}

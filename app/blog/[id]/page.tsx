import React from 'react';
import BlogDetailClient from '@/components/patient/BlogDetailClient';
import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';
import { getBlogPostById, incrementBlogViews, getRelatedBlogs, getBlogPosts } from '@/lib/db/blogs';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [settings, cms, post] = await Promise.all([
    getClinicSettings(),
    getCmsSettings(),
    getBlogPostById(id),
  ]);

  if (!post) {
    return (
      <main className="min-h-screen bg-surface flex flex-col justify-between text-left">
        <Navbar settings={settings} cms={cms} />
        <div className="max-w-md mx-auto py-32 px-4 space-y-4">
          <h2 className="font-playfair text-2.5xl font-black text-gray-900 leading-tight">Article Not Found</h2>
          <p className="font-sans text-xs text-gray-800 font-semibold leading-relaxed">
            The requested clinical publication could not be retrieved from the active clinic logs. It may have been edited or removed by our administrative center.
          </p>
          <Link
            href="/blog"
            className="px-4 py-2 bg-[#1B4F72] hover:bg-teal-600 text-white font-sans text-xs font-bold rounded-lg inline-block text-center"
          >
            Return to Clinical Library
          </Link>
        </div>
        <Footer settings={settings} cms={cms} />
      </main>
    );
  }

  // Increment views
  await incrementBlogViews(id);

  // Fetch sidebar widgets data
  const [relatedPosts, { posts: recentPosts }] = await Promise.all([
    getRelatedBlogs(id, post.category, 3),
    getBlogPosts({ admin: false, page: 1, limit: 15 }), // fetch 15 to select popular
  ]);

  // Derive popular posts (sorted by views in memory)
  const popularPosts = [...recentPosts]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);

  // Limit recent posts to 3
  const recentThree = recentPosts.slice(0, 3);

  return (
    <BlogDetailClient
      post={post}
      relatedPosts={relatedPosts}
      recentPosts={recentThree}
      popularPosts={popularPosts}
      settings={settings}
      cms={cms}
    />
  );
}

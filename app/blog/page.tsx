import React from 'react';
import BlogListingClient from '@/components/patient/BlogListingClient';
import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';
import { getBlogPosts } from '@/lib/db/blogs';

export default async function BlogListingPage() {
  const settings = await getClinicSettings();
  const cms = await getCmsSettings();
  
  // Fetch initial posts on the server (first page, limit of 9)
  const { posts: initialPosts, total: initialTotal } = await getBlogPosts({
    admin: false,
    category: 'All',
    search: '',
    page: 1,
    limit: 9
  });

  return (
    <BlogListingClient 
      initialPosts={initialPosts} 
      initialTotal={initialTotal} 
      settings={settings} 
      cms={cms} 
    />
  );
}

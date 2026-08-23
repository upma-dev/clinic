import React from 'react';
import Navbar from '@/components/sections/Navbar';
import Gallery from '@/components/sections/Gallery';
import BeforeAfter from '@/components/sections/BeforeAfter';
import VideoSection from '@/components/sections/VideoSection';
import Footer from '@/components/sections/Footer';
import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';

export default async function GalleryPage() {
  const settings = await getClinicSettings();
  const cms = await getCmsSettings();

  return (
    <main className="min-h-screen bg-surface">
      <Navbar settings={settings} cms={cms} />
      <div className="pt-24 select-text">
        <Gallery cms={cms} />
        <BeforeAfter />
        <VideoSection />
      </div>
      <Footer settings={settings} cms={cms} />
    </main>
  );
}

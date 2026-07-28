import React from 'react';
import Navbar from '@/components/sections/Navbar';
import About from '@/components/sections/About';
import Footer from '@/components/sections/Footer';
import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';

export default async function AboutPage() {
  const settings = await getClinicSettings();
  const cms = await getCmsSettings();

  return (
    <main className="min-h-screen bg-surface">
      <Navbar settings={settings} cms={cms} />
      <div className="pt-24 select-text">
        <About cms={cms} />
      </div>
      <Footer settings={settings} cms={cms} />
    </main>
  );
}

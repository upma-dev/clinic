import React from 'react';
import Navbar from '@/components/sections/Navbar';
import Services from '@/components/sections/Services';
import Footer from '@/components/sections/Footer';
import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';

export default async function ServicesPage() {
  const settings = await getClinicSettings();
  const cms = await getCmsSettings();

  return (
    <main className="min-h-screen bg-surface">
      <Navbar settings={settings} cms={cms} />
      <div className="pt-24 select-text">
        <Services cms={cms} />
      </div>
      <Footer settings={settings} cms={cms} />
    </main>
  );
}

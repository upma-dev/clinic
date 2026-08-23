import React from 'react';
import Navbar from '@/components/sections/Navbar';
import BookingForm from '@/components/sections/BookingForm';
import Footer from '@/components/sections/Footer';
import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';

export default async function BookingPage() {
  const settings = await getClinicSettings();
  const cms = await getCmsSettings();

  return (
    <main className="min-h-screen bg-surface">
      <Navbar settings={settings} cms={cms} />
      <div className="pt-20 sm:pt-28 pb-6 select-text">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BookingForm />
        </div>
      </div>
      <Footer settings={settings} cms={cms} />
    </main>
  );
}

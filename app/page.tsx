// export const dynamic = 'force-dynamic';

// import React from 'react';
// import Navbar from '@/components/sections/Navbar';
// import Hero from '@/components/sections/Hero';
// import Services from '@/components/sections/Services';
// import About from '@/components/sections/About';
// import Certificates from '@/components/sections/Certificates';
// import BeforeAfter from '@/components/sections/BeforeAfter';
// import VideoSection from '@/components/sections/VideoSection';
// import Testimonials from '@/components/sections/Testimonials';
// import BlogSection from '@/components/sections/Blog';
// import PatientPortal from '@/components/sections/PatientPortal';
// import HowToUse from '@/components/sections/HowToUse';
// import Contact from '@/components/sections/Contact';
// import Footer from '@/components/sections/Footer';

// import { getClinicSettings } from '@/lib/db/settings';
// import { getCmsSettings } from '@/lib/db/cms';

// export default async function Home() {
//   const settings = await getClinicSettings();
//   const cms = await getCmsSettings();

//   return (
//     <main className="min-h-screen bg-surface selection:bg-accent/30 selection:text-text">

//       {/* Dynamic top banner alert */}
//       {cms.bannerEnabled && cms.bannerText && (
//         <div className="bg-gradient-to-r from-primary to-accent text-white py-2.5 px-4 text-center text-xs font-bold font-sans tracking-wide z-50 relative animate-pulse">
//           <a href={cms.bannerLink || '/booking'}>{cms.bannerText}</a>
//         </div>
//       )}

//       <Navbar settings={settings} cms={cms} />

//       {/* 1. Hero — first impression + SEO H1 */}
//       <Hero settings={settings} cms={cms} />

//       {/* 3. Services */}
//       <Services cms={cms} />

//       {/* 4. About */}
//       <About cms={cms} />

//       {/* 5. Certificates */}
//       <Certificates cms={cms} />

//       {/* 6. Before & After */}
//       <BeforeAfter />

//       {/* 7. Video — educational content */}
//       <VideoSection />

//       {/* 8. Testimonials — social proof */}
//       <Testimonials cms={cms} />

//       {/* 9. Patient Portal — Check live queue */}
//       <PatientPortal />

//       {/* 10. How To Use — Guide */}
//       <HowToUse />

//       {/* 11. Blog */}
//       <BlogSection cms={cms} />

//       {/* 12. Contact + Map */}
//       <Contact settings={settings} cms={cms} />

//       <Footer settings={settings} cms={cms} />
//     </main>
//   );
// }



export const dynamic = 'force-dynamic';

import React from 'react';
import Navbar from '@/components/sections/Navbar';
import Hero from '@/components/sections/Hero';
import Services from '@/components/sections/Services';
import About from '@/components/sections/About';
import Certificates from '@/components/sections/Certificates';
import BeforeAfter from '@/components/sections/BeforeAfter';
import VideoSection from '@/components/sections/VideoSection';
import Testimonials from '@/components/sections/Testimonials';
import BlogSection from '@/components/sections/Blog';
import PatientPortal from '@/components/sections/PatientPortal';
import HowToUse from '@/components/sections/HowToUse';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/sections/Footer';

import { getClinicSettings } from '@/lib/db/settings';
import { getCmsSettings } from '@/lib/db/cms';

export default async function Home() {
  const [settings, cms] = await Promise.all([
    getClinicSettings(),
    getCmsSettings(),
  ]);

  return (
    <main className="min-h-screen bg-surface selection:bg-accent/30 selection:text-text">

      <Navbar settings={settings} cms={cms} />

      {/* 1. Hero — first impression + SEO H1 */}
      <Hero settings={settings} cms={cms} />

      {/* 3. Services */}
      <Services cms={cms} />

      {/* 4. About */}
      <About cms={cms} />

      {/* 5. Certificates */}
      <Certificates cms={cms} />

      {/* 6. Before & After */}
      <BeforeAfter cms={cms} />

      {/* 7. Video — educational content */}
      <VideoSection cms={cms} />

      {/* 8. Testimonials — social proof */}
      <Testimonials cms={cms} />

      {/* 11. Blog */}
      <BlogSection cms={cms} />

      {/* 9. Patient Portal — Check live queue */}
      <PatientPortal />

      {/* 10. How To Use — Guide */}
      <HowToUse />

      {/* 12. Contact + Map */}
      <Contact settings={settings} cms={cms} />

      <Footer settings={settings} cms={cms} />
    </main>
  );
}
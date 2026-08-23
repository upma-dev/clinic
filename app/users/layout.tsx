import React from 'react';
import PatientTopNav from '@/components/patient/PatientTopNav';
import PatientBottomNav from '@/components/patient/PatientBottomNav';

export default function PatientAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Mobile Top Navbar */}
      <PatientTopNav />

      {/* Main Content Area */}
      {/* Added bottom padding to account for the bottom nav bar (pb-20 or pb-24) */}
      <main className="flex-1 w-full pb-[80px] md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <PatientBottomNav />
      
      {/* Add a global style to hide the FloatingSidebar on mobile when in patient app, 
          since the bottom nav covers the bottom area. */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          #floating-sidebar {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}

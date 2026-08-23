'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StaffDashboard from '@/components/admin/StaffDashboard';

export default function StaffPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/login')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated && data.role === 'staff') {
          setAuthorized(true);
        } else {
          router.replace('/admin');
        }
      })
      .catch(() => router.replace('/admin'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Skin Hub</p>
              <p className="font-playfair text-xl font-bold text-gray-900">Checking Staff Credentials</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-primary/70 animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return <StaffDashboard onLogout={() => router.push('/admin')} />;
}

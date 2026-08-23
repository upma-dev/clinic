'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLogin from '@/components/admin/AdminLogin';
import type { AdminRole } from '@/lib/types';

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/login')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          if (data.role === 'staff') {
            router.replace('/admin/staff');
          } else if (data.role === 'doctor') {
            router.replace('/admin/doctor');
          }
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleLoginSuccess = (role: AdminRole) => {
    if (role === 'staff') {
      router.push('/admin/staff');
    } else {
      router.push('/admin/doctor');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Skin Hub</p>
              <p className="font-playfair text-xl font-bold text-gray-900">Loading Admin Portal</p>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-primary/70 animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>
          <p className="mt-4 text-xs font-semibold text-gray-600">
            Checking secure session…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 rounded-3xl border border-gray-200 bg-white shadow-lg p-5">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Secure Access</p>
          <p className="font-playfair text-xl font-bold text-gray-900 mt-1">Admin Login Required</p>
          <p className="text-xs font-semibold text-gray-600 mt-1">
            Doctor / Staff dashboard uses a protected server session.
          </p>
        </div>
        <AdminLogin onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}

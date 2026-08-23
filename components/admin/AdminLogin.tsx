'use client';

import React, { useState } from 'react';
import { ShieldCheck, User, Stethoscope, Lock, ArrowRight } from 'lucide-react';
import type { AdminRole } from '@/lib/types';

interface AdminLoginProps {
  onSuccess: (role: AdminRole) => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [role, setRole] = useState<AdminRole>('staff');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, pin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      onSuccess(role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden font-sans">
      {/* Top Header Card Banner */}
      <div className="bg-gradient-to-br from-[#0B1B29] via-[#1B4F72] to-[#2FA88A] p-8 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-4 text-emerald-300 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h2 className="font-playfair text-2.5xl font-black text-white tracking-wide">Clinic Portal Access</h2>
        <p className="text-xs text-emerald-100 font-semibold mt-1">
          Authorized personnel only. Verification handled securely.
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        
        {/* Role Switcher Cards */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left">
            Select Authorization Portal Role
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('staff')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer outline-none ${
                role === 'staff'
                  ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                role === 'staff' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <User className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs">Staff / Desk</p>
              <p className="text-[10px] text-gray-500 font-medium">Reception & Walk-in</p>
            </button>

            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer outline-none ${
                role === 'doctor'
                  ? 'bg-blue-50/80 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                role === 'doctor' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Stethoscope className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs">Doctor Portal</p>
              <p className="text-[10px] text-gray-500 font-medium">Full Admin Control</p>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-between">
              <span>Enter Security PIN</span>
              <span className="text-[9px] text-gray-400 font-normal flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" /> Encrypted PIN
              </span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              required
              placeholder="••••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center px-4 py-3.5 bg-gray-50/60 border border-gray-250 rounded-2xl text-xl tracking-widest font-black text-gray-900 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 p-3 rounded-xl text-center animate-fade-in">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] hover:brightness-110 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer outline-none"
          >
            {loading ? 'Verifying Credentials...' : 'Unlock Dashboard Portal'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

      </div>
    </div>
  );
}

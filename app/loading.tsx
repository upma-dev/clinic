import React from 'react';
import { Activity, Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-teal-100 shadow-2xl rounded-3xl p-8 max-w-xs w-full text-center space-y-4 flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-6 h-6 text-teal-600 animate-pulse" />
          </div>
        </div>
        <div>
          <p className="font-playfair text-base font-black text-gray-900 tracking-tight flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            Skin Hub Clinic
          </p>
          <p className="font-sans text-xs text-teal-700 font-bold uppercase tracking-widest mt-1">
            Loading Page...
          </p>
        </div>
      </div>
    </div>
  );
}

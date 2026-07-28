'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, RefreshCw, AlertCircle, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface PatientQueueSnapshot {
  currentToken: number;
  servingPatient: { token: number; firstName: string } | null;
  totalWaiting: number;
  totalToday: number;
  estimatedWaitMinutes: number;
  congestion: 'green' | 'yellow' | 'red';
  message: string;
  lastUpdated: string;
  status: 'active' | 'paused' | 'away';
  queuePreview: { token: number; firstName: string; position: number; status: string }[];
}

export default function QueueStatus() {
  const [data, setData] = useState<PatientQueueSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/queue');
      if (res.ok) {
        const queueState = await res.json();
        setData(queueState);
      }
    } catch (err) {
      console.error('Error fetching public queue status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto sync every 5 seconds for real-time patient queue monitoring
    const timer = setInterval(fetchQueue, 5000);
    return () => clearInterval(timer);
  }, []);

  const getDoctorStatusLabel = (status?: 'active' | 'paused' | 'away') => {
    switch (status) {
      case 'paused':
        return (
          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-full animate-pulse">
            ⏸️ Temporarily Paused
          </span>
        );
      case 'away':
        return (
          <span className="px-3 py-1 bg-rose-500/20 border border-rose-500 text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-full">
            Away
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-full">
            🟢 Doctor Available
          </span>
        );
    }
  };

  const getCongestionBanner = (congestion?: 'green' | 'yellow' | 'red') => {
    switch (congestion) {
      case 'red':
        return 'bg-rose-50 border-rose-200 text-rose-900';
      case 'yellow':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    }
  };

  return (
    <section id="queue-status" className="py-8 bg-white border-y border-gray-250 select-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-[#F8F6F2] rounded-2xl border border-gray-300 p-6 sm:p-8 shadow-md relative overflow-hidden">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-300 pb-5 mb-6 text-left">
            <div className="space-y-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-sans text-xs font-bold leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
                Live Patient Tracker
              </span>
              <h3 className="font-playfair text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Outpatient Department Queue
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {getDoctorStatusLabel(data?.status)}
              <button
                onClick={fetchQueue}
                className="p-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg cursor-pointer transition-colors shadow-xs"
                title="Refresh Live Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Core Queue Stats Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Serving */}
            <div className="bg-white border border-gray-250 p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs text-left">
              <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5.5 h-5.5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Now Serving Token</span>
                <span className="text-2.5xl font-black text-gray-950 block">
                  #{data?.currentToken || '—'}
                </span>
                {data?.servingPatient && (
                  <span className="text-[10px] text-gray-500 font-bold block uppercase leading-none mt-1">
                     Serving: {data.servingPatient.firstName}
                  </span>
                )}
              </div>
            </div>

            {/* Waiting Gap */}
            <div className="bg-white border border-gray-250 p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs text-left">
              <div className="w-11 h-11 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                <Clock className="w-5.5 h-5.5 text-teal-600" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Est. Waiting Time</span>
                <span className="text-2.5xl font-black text-gray-950 block">
                  ~{data?.estimatedWaitMinutes || 0} min
                </span>
              </div>
            </div>

            {/* Total Waiting in lobby */}
            <div className="bg-white border border-gray-250 p-4 rounded-xl flex items-center space-x-3.5 shadow-2xs text-left">
              <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Users className="w-5.5 h-5.5 text-amber-700" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Patients Waiting</span>
                <span className="text-2.5xl font-black text-gray-950 block">
                  {data?.totalWaiting || 0} queued
                </span>
              </div>
            </div>

          </div>

          {/* Broadcast alert text message */}
          {data?.message && (
            <div className={`mt-5 p-4 rounded-xl border flex items-start space-x-3 text-left leading-normal font-sans text-xs ${getCongestionBanner(data.congestion)}`}>
              <AlertCircle className="w-5 h-5 text-current shrink-0 mt-0.5" />
              <div className="space-y-1 font-semibold text-gray-800">
                <p>{data.message}</p>
                <p className="text-[9px] font-mono text-gray-400">
                  Last Updated: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'Recently'}
                </p>
              </div>
            </div>
          )}

          {/* Secure Patient Waitlist Table */}
          <div className="mt-6 border border-gray-300 rounded-xl bg-white overflow-hidden text-left shadow-2xs">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h4 className="font-playfair text-xs sm:text-sm font-bold text-gray-950 tracking-tight flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                Active Queue Waitlist
              </h4>
              <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-emerald-600" /> Privacy Masked
              </span>
            </div>

            {!data || data.queuePreview.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-gray-500">
                Lobby empty. No active patients are currently waiting.
              </div>
            ) : (
              <div className="divide-y divide-gray-150 max-h-64 overflow-y-auto">
                {data.queuePreview.map((item) => (
                  <div key={item.token} className="p-3 px-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-xs font-sans">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-black text-primary bg-surface border px-2 py-0.5 rounded shadow-3xs">
                        Token #{item.token}
                      </span>
                      <span className="font-bold text-gray-800 uppercase tracking-wide">
                        {item.firstName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Position in Line:</span>
                      <span className="w-6 h-6 rounded-full bg-[#1B4F72] text-white flex items-center justify-center font-bold text-[10px]">
                        #{item.position}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}

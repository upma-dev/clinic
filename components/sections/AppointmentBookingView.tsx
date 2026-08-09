'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, RefreshCw, List } from 'lucide-react';
import type { QueueState } from '@/lib/types';
import { motion } from 'motion/react';

export default function AppointmentBookingView() {
  // === QUEUE STATE ===
  const [queueData, setQueueData] = useState<QueueState>({
    currentPatient: 0,
    totalPatientsToday: 0,
    estimatedWaitTime: 0,
    status: 'green',
    message: 'Loading clinic status...',
    lastUpdated: new Date().toISOString()
  });
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Fetch Queue & Waitlist
  const fetchQueueData = async () => {
    setLoadingQueue(true);
    try {
      const qRes = await fetch('/api/queue');
      if (qRes.ok) {
        const data = await qRes.json();
        setQueueData(data.legacy || {
          currentPatient: data.currentToken || 0,
          totalPatientsToday: data.totalToday || 0,
          estimatedWaitTime: data.estimatedWaitMinutes || 0,
          status: data.congestion || 'green',
          message: data.message || 'Walk-ins open.',
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        });
        setWaitlist(data.queuePreview || []);
      }
    } catch (err) {
      console.warn('Queue data fetch warning:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  // Initial load & Polling for live queue
  useEffect(() => {
    setMounted(true);
    fetchQueueData();
    const queueTimer = setInterval(() => {
      fetchQueueData();
    }, 15000); // 15s polling for live waitlist
    return () => clearInterval(queueTimer);
  }, []);

  const statusColors = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    red: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const congestionDots = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500'
  };

  return (
    <div className="max-w-2xl mx-auto">
      
      {/* Integrated Live Clinic Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`rounded-2xl border shadow-md p-5 sm:p-6 transition-colors duration-500 space-y-4 ${statusColors[queueData.status as keyof typeof statusColors] || statusColors.green}`}
      >
        <div className="flex justify-between items-start mb-1">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${congestionDots[queueData.status as keyof typeof congestionDots]}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${congestionDots[queueData.status as keyof typeof congestionDots]}`}></span>
              </div>
              <h3 className="font-sans font-bold text-xs uppercase tracking-widest opacity-80">Live Clinic Status</h3>
            </div>
            <h4 className="font-playfair text-xl sm:text-2xl font-extrabold mt-1">{queueData.message}</h4>
          </div>
          <button 
            onClick={fetchQueueData} 
            disabled={loadingQueue}
            className="p-2 bg-white/40 hover:bg-white/60 rounded-full transition-all text-gray-800 disabled:opacity-50 shadow-xs cursor-pointer shrink-0 ml-2"
            aria-label="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loadingQueue ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3.5 border border-white/50 shadow-2xs">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 opacity-70" />
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Current Token</p>
            </div>
            <p className="text-2xl font-black">{queueData.currentPatient || '--'}</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3.5 border border-white/50 shadow-2xs">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 opacity-70" />
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Est. Wait Time</p>
            </div>
            <p className="text-2xl font-black">{queueData.estimatedWaitTime}<span className="text-sm font-bold ml-1 opacity-70">mins</span></p>
          </div>
        </div>

        {/* Integrated Waitlist */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3.5 border border-white/50 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-black/10">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 opacity-70" />
              <h3 className="font-playfair text-sm font-bold text-gray-900">Current Waitlist</h3>
            </div>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider font-mono">Live Queue</span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {waitlist.length === 0 ? (
              <p className="text-center py-3 text-xs font-semibold opacity-60">No patients waiting right now.</p>
            ) : (
              waitlist.map((item) => (
                <div key={item.token} className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 border border-white/60 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-sm opacity-50">#{item.position}</span>
                    <div>
                      <p className="font-bold text-gray-900">{item.firstName}</p>
                      <p className="text-[10px] font-bold text-primary font-mono">Token #{item.token}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    item.status === 'serving' || item.status === 'consulting' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <p className="text-[11px] font-semibold opacity-60 pt-1 flex items-center justify-center">
          <Clock className="w-3 h-3 mr-1" />
          Last updated: {mounted ? new Date(queueData.lastUpdated).toLocaleTimeString() : ''}
        </p>
      </motion.div>
    </div>
  );
}

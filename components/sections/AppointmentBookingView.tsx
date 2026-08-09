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
    <div className="max-w-2xl mx-auto space-y-4">
      
      {/* Live Clinic Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`rounded-2xl border shadow-md p-5 sm:p-6 transition-colors duration-500 ${statusColors[queueData.status as keyof typeof statusColors] || statusColors.green}`}
      >
        <div className="flex justify-between items-start mb-4">
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
        
        <p className="text-[11px] font-semibold opacity-60 mt-3 flex items-center justify-center">
          <Clock className="w-3 h-3 mr-1" />
          Last updated: {mounted ? new Date(queueData.lastUpdated).toLocaleTimeString() : ''}
        </p>
      </motion.div>

      {/* Live Waitlist Display */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white rounded-2xl border border-gray-200 shadow-md p-5"
      >
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <List className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-playfair text-lg font-bold text-gray-900">Current Waitlist</h3>
            <p className="font-sans text-[11px] text-gray-500 font-semibold">Live clinic waiting queue</p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
          {waitlist.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 font-semibold text-xs">No patients waiting right now.</p>
            </div>
          ) : (
            waitlist.map((item) => (
              <div key={item.token} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-surface text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-black text-lg text-gray-300 w-6">#{item.position}</span>
                  <div>
                    <p className="font-bold text-gray-900">
                      {item.firstName}
                    </p>
                    <p className="text-[10px] font-bold text-primary font-mono">
                      Token #{item.token}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  item.status === 'serving' || item.status === 'consulting' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

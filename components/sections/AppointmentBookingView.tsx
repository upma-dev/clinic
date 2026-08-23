'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Users, RefreshCw, List, Search, Filter, ChevronLeft, ChevronRight, 
  UserCheck, CheckCircle2, ShieldCheck, Stethoscope, Phone, Calendar, Hash, XCircle
} from 'lucide-react';
import type { QueueState } from '@/lib/types';
import { motion } from 'motion/react';

interface PatientQueueItem {
  token: number;
  firstName: string;
  phone?: string;
  service?: string;
  time?: string;
  position: number;
  status: 'waiting' | 'serving' | 'consulting' | 'done' | 'completed' | 'cancelled';
  bookingId?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pending';
}

export default function AppointmentBookingView() {
  // === QUEUE & DB STATE ===
  const [queueData, setQueueData] = useState<QueueState>({
    currentPatient: 0,
    totalPatientsToday: 0,
    estimatedWaitTime: 0,
    status: 'green',
    message: 'Loading live clinic status...',
    lastUpdated: new Date().toISOString()
  });

  const [rawWaitlist, setRawWaitlist] = useState<PatientQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [mounted, setMounted] = useState(false);

  // === SEARCH, FILTER & PAGINATION STATE ===
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'serving' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Fetch Queue & Real DB Data
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

        const listFromDb: PatientQueueItem[] = (data.queuePreview || []).map((e: any, idx: number) => ({
          token: e.token || idx + 1,
          firstName: e.firstName || e.name || `Patient #${idx + 1}`,
          phone: e.phone || e.mobile || '+91 98*** **' + (100 + idx),
          service: e.service || 'Skin & Hair Consultation',
          time: e.time || 'Today',
          position: e.position || idx + 1,
          status: e.status || 'waiting',
          bookingId: e.bookingId || `SKN-${idx + 101}`,
          paymentStatus: e.paymentStatus || 'paid'
        }));

        setRawWaitlist(listFromDb);
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
    }, 12000); // 12s live polling
    return () => clearInterval(queueTimer);
  }, []);

  // Filtered list based on Search & Status Tab
  const filteredWaitlist = useMemo(() => {
    return rawWaitlist.filter((patient) => {
      // Status filter
      if (statusFilter === 'waiting' && patient.status !== 'waiting') return false;
      if (statusFilter === 'serving' && patient.status !== 'serving' && patient.status !== 'consulting') return false;
      if (statusFilter === 'completed' && patient.status !== 'done' && patient.status !== 'completed') return false;

      // Search query filter (matches name, phone, token #, or service)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = patient.firstName.toLowerCase().includes(query);
        const matchesPhone = (patient.phone || '').toLowerCase().includes(query);
        const matchesToken = String(patient.token).includes(query);
        const matchesService = (patient.service || '').toLowerCase().includes(query);
        const matchesBookingId = (patient.bookingId || '').toLowerCase().includes(query);

        return matchesName || matchesPhone || matchesToken || matchesService || matchesBookingId;
      }

      return true;
    });
  }, [rawWaitlist, searchQuery, statusFilter]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Paginated items
  const totalPages = Math.ceil(filteredWaitlist.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWaitlist.slice(start, start + pageSize);
  }, [filteredWaitlist, currentPage, pageSize]);

  const statusColors = {
    green: 'bg-emerald-100/90 text-emerald-950 border-emerald-200/80',
    yellow: 'bg-amber-100/90 text-amber-950 border-amber-200/80',
    red: 'bg-rose-100/90 text-rose-950 border-rose-200/80',
  };

  const congestionDots = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500'
  };

  return (
    <div className="max-w-4xl mx-auto font-sans">
      
      {/* Unified Single Rectangle Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        
        {/* 1. Sleek Green Header Strip (Attached seamlessly at the top) */}
        <div className={`px-5 py-3 border-b transition-colors duration-500 flex flex-wrap items-center justify-between gap-3 ${statusColors[queueData.status as keyof typeof statusColors] || statusColors.green}`}>
          <div className="flex items-center gap-3 flex-wrap text-xs font-semibold">
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/70">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${congestionDots[queueData.status as keyof typeof congestionDots]}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${congestionDots[queueData.status as keyof typeof congestionDots]}`}></span>
              </span>
              <span className="font-bold text-[10px] uppercase tracking-widest text-gray-800">Live Status</span>
            </div>
            
            <p className="font-semibold text-xs text-gray-900">{queueData.message}</p>

            <div className="flex items-center gap-2 pl-2 border-l border-emerald-300/60">
              <span className="bg-white/80 px-2.5 py-0.5 rounded-lg border border-white/80 text-gray-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                Serving: <span className="font-mono font-black text-sm text-emerald-800">{queueData.currentPatient ? `#${queueData.currentPatient}` : '--'}</span>
              </span>

              <span className="bg-white/80 px-2.5 py-0.5 rounded-lg border border-white/80 text-gray-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                Wait: <span className="font-mono font-black text-sm text-emerald-800">{queueData.estimatedWaitTime}m</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold opacity-75 text-gray-700">
              Updated: {mounted ? new Date(queueData.lastUpdated).toLocaleTimeString() : ''}
            </span>
            <button 
              onClick={fetchQueueData} 
              disabled={loadingQueue}
              className="p-1.5 bg-white/80 hover:bg-white rounded-full transition-all text-gray-800 disabled:opacity-50 shadow-2xs cursor-pointer border border-white"
              aria-label="Refresh Queue"
              title="Refresh Whole Queue List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2. Interactive Patient Waitlist Section */}
        <div className="p-5 sm:p-7 space-y-5">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-150">
            <div>
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-primary" />
                <h3 className="font-playfair text-xl font-bold text-gray-900">Waitlist & Patient Tokens</h3>
                <button 
                  onClick={fetchQueueData}
                  disabled={loadingQueue}
                  className="px-2 py-1 text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  title="Refresh Whole List"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingQueue ? 'animate-spin' : ''}`} /> Refresh All
                </button>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Real-time patient queue tokens and scheduled appointments</p>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, token..."
                className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Patients', count: rawWaitlist.length },
              { id: 'waiting', label: 'In Queue', count: rawWaitlist.filter(p => p.status === 'waiting').length },
              { id: 'serving', label: 'Serving Now', count: rawWaitlist.filter(p => p.status === 'serving' || p.status === 'consulting').length },
              { id: 'completed', label: 'Completed Today', count: rawWaitlist.filter(p => p.status === 'done' || p.status === 'completed').length },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive 
                      ? 'bg-primary text-white shadow-xs' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Patient Cards / Table List */}
          <div className="space-y-3 min-h-[220px]">
            {paginatedList.length === 0 ? (
              <div className="text-center py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <List className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-bold text-sm">No patients found</p>
                <p className="text-gray-400 text-xs mt-1">
                  {searchQuery ? 'Try matching another name or mobile number' : 'No patients currently in this queue status'}
                </p>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    Clear Search Filter
                  </button>
                )}
              </div>
            ) : (
              paginatedList.map((item) => (
                <motion.div 
                  key={item.token}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-gray-150 bg-gray-50/40 hover:bg-blue-50/20 hover:border-blue-200 transition-all gap-3 shadow-2xs"
                >
                  {/* Left: Token & Patient Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-tighter opacity-70">Token</span>
                      <span className="font-black text-base leading-tight font-mono">#{item.token}</span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm">{item.firstName}</h4>
                        {item.bookingId && (
                          <span className="text-[9px] font-mono bg-gray-200/60 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                            {item.bookingId}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-semibold">
                        {item.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {item.phone}
                          </span>
                        )}
                        {item.service && (
                          <span className="flex items-center gap-1 text-primary">
                            <Stethoscope className="w-3 h-3" />
                            {item.service}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Payment Badges */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.paymentStatus && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase flex items-center gap-1 ${
                        item.paymentStatus === 'paid' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        {item.paymentStatus}
                      </span>
                    )}

                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-lg uppercase flex items-center gap-1.5 tracking-wider ${
                      item.status === 'serving' || item.status === 'consulting' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : item.status === 'done' || item.status === 'completed'
                          ? 'bg-gray-200 text-gray-700'
                          : item.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-500 text-white shadow-xs'
                    }`}>
                      {item.status === 'serving' || item.status === 'consulting' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {item.status}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Pagination Bar */}
          {filteredWaitlist.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-150 text-xs font-semibold text-gray-500">
              <p>
                Showing <span className="font-bold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold text-gray-900">{Math.min(currentPage * pageSize, filteredWaitlist.length)}</span> of{' '}
                <span className="font-bold text-gray-900">{filteredWaitlist.length}</span> patients
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-800 font-bold font-mono text-xs">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

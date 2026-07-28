'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LogOut, Menu, Clock, UserPlus, Calendar, Inbox, Video,
  RefreshCw, ShieldCheck, ChevronLeft, ChevronRight, X, PanelLeftClose
} from 'lucide-react';
import WalkInForm from './WalkInForm';
import QueueControls from './QueueControls';
import AppointmentsList from './AppointmentsList';
import WalkinRequestsList from './WalkinRequestsList';
import TelemedicineAdmin from './TelemedicineAdmin';
import type { Booking, DailyQueue, QueueEntry } from '@/lib/types';

type StaffTab = 'queue' | 'walkin' | 'schedule' | 'requests' | 'telemedicine';

interface StaffDashboardProps {
  onLogout: () => void;
}

export default function StaffDashboard({ onLogout }: StaffDashboardProps) {
  const [tab, setTab] = useState<StaffTab>('queue');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [daily, setDaily] = useState<DailyQueue | null>(null);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const apptRes = await fetch('/api/appointments');
      if (apptRes.ok) {
        const all = await apptRes.json();
        setAllBookings(all);
        setBookings(all.filter((b: Booking) => b.date === today));
      }
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  const handleAction = async (
    id: string,
    action: string,
    nextScheduleDate?: string,
    rescheduleDate?: string,
    rescheduleTime?: string,
    rescheduleReason?: string,
    paymentMethod?: string
  ) => {
    const res = await fetch('/api/appointments/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        action,
        nextScheduleDate,
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        reason: rescheduleReason,
        paymentMethod,
      }),
    });
    refresh();
    if (res.ok) {
      const data = await res.json();
      return data; // returns { whatsappUrl } if available
    }
  };

  const logout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    onLogout();
  };

  const tabs: { id: StaffTab; label: string; description: string; icon: React.ReactNode }[] = [
    {
      id: 'queue',
      label: 'Live Queue',
      description: 'Manage OPD Queue',
      icon: <Clock className="w-5 h-5" />
    },
    // {
    //   id: 'walkin',
    //   label: 'Walk-in Registry',
    //   description: 'New Token Issue',
    //   icon: <UserPlus className="w-5 h-5" />
    // },
    {
      id: 'schedule',
      label: "Today's Schedule",
      description: 'Bookings & Arrival',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      id: 'requests',
      label: 'Walk-in Requests',
      description: 'Patient Self-Checkin',
      icon: <Inbox className="w-5 h-5" />
    },
    {
      id: 'telemedicine',
      label: 'Online Consult',
      description: 'Video Appointments',
      icon: <Video className="w-5 h-5" />
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors focus:outline-none flex items-center gap-1.5"
            title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0B1B29] to-[#1B4F72] text-white flex items-center justify-center font-serif font-black text-base shadow-sm">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-playfair text-base font-bold text-gray-900 leading-tight">Skin Hub Clinic</h1>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-200">
                  Staff Panel
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-semibold hidden sm:block">Reception & OPD Operations</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className={`p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all ${loading ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Backdrop overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-20"
          />
        )}

        {/* Floating Open Handle on left screen edge when sidebar is hidden */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 bg-[#0B1B29] text-white p-2.5 rounded-r-2xl shadow-xl hover:bg-[#1B4F72] transition-all z-30 items-center justify-center border-y border-r border-white/20 group"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:scale-125 transition-transform" />
          </button>
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`
            fixed lg:static top-[57px] bottom-0 left-0 z-20
            w-72 bg-white border-r border-gray-200/80 flex flex-col justify-between
            transition-all duration-300 ease-in-out shadow-lg lg:shadow-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden lg:border-none'}
          `}
        >
          <div className="p-4 space-y-2 overflow-y-auto">
            {/* Sidebar Top Controls Header */}
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Navigation Menu
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                title="Hide Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`
                    w-full px-4 py-3.5 rounded-2xl flex items-center justify-between text-left transition-all duration-200 group outline-none
                    ${isActive
                      ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`
                        w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                        ${isActive
                          ? 'bg-white/15 text-emerald-300'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-primary'
                        }
                      `}
                    >
                      {t.icon}
                    </div>
                    <div className="truncate">
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-gray-800'}`}>
                        {t.label}
                      </p>
                      <p className={`text-[10px] font-semibold truncate ${isActive ? 'text-emerald-200' : 'text-gray-400'}`}>
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Skin Hub Admin v2.0</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-[10px] font-bold text-gray-400 hover:text-gray-700 underline"
            >
              Hide
            </button>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
          {tab === 'queue' && (
            <QueueControls todayBookings={bookings} onUpdate={refresh} role="staff" />
          )}
          {tab === 'walkin' && (
            <div className="max-w-2xl mx-auto">
              <WalkInForm onRegistered={refresh} />
            </div>
          )}
          {tab === 'schedule' && (
            <AppointmentsList
              bookings={allBookings}
              loading={loading}
              onAction={handleAction}
              onRefresh={refresh}
            />
          )}
          {tab === 'requests' && <WalkinRequestsList />}
          {tab === 'telemedicine' && (
            <div className="max-w-4xl mx-auto">
              <TelemedicineAdmin />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

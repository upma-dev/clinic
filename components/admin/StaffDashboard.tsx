'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut, Menu, Clock, UserPlus, Calendar, Inbox, Video,
  RefreshCw, ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, X, PanelLeftClose, Bell, CheckCircle
} from 'lucide-react';
import WalkInForm from './WalkInForm';
import QueueControls from './QueueControls';
import AppointmentsList from './AppointmentsList';
import WalkinRequestsList from './WalkinRequestsList';
import TelemedicineAdmin from './TelemedicineAdmin';
import type { Booking, DailyQueue, QueueEntry, DbNotification } from '@/lib/types';

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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    opd: true,
    consult: true,
  });

  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [notifTrayOpen, setNotifTrayOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Track latest notification IDs to avoid missing alerts when count is 0
  const lastSeenNotifIdRef = React.useRef<string | null>(null);
  const isFirstLoadRef = React.useRef(true);

  const triggerToast = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 12000); // 12 seconds to give staff enough time to read
  };

  const playPing = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      console.log('🔊 playPing: attempting to play alert sound /notification.mp3...');
      audioRef.current.currentTime = 0; // Reset audio file playback to the beginning
      audioRef.current.play()
        .then(() => {
          console.log('✅ playPing: Sound played successfully.');
        })
        .catch((err) => {
          console.warn('❌ playPing: HTML5 Audio play was blocked by browser autoplay policy or failed. User must interact with the page first:', err);
        });
    } catch (err) {
      console.error('❌ playPing: Error initializing or playing audio:', err);
    }
  };

  const handleNewNotifications = useCallback((notifs: DbNotification[]) => {
    console.log(`📡 handleNewNotifications: Received ${notifs.length} total notifications.`);
    if (!notifs || notifs.length === 0) {
      lastSeenNotifIdRef.current = null;
      isFirstLoadRef.current = false;
      return;
    }

    const latestNotif = notifs[0]; // Sorted newest first (createdAt: -1)
    const latestId = latestNotif.id;

    if (isFirstLoadRef.current) {
      console.log(`ℹ️ handleNewNotifications (First Load): Storing latest notification ID [${latestId}] as baseline.`);
      lastSeenNotifIdRef.current = latestId;
      isFirstLoadRef.current = false;
      return;
    }

    const previousId = lastSeenNotifIdRef.current;
    console.log(`ℹ️ handleNewNotifications: Checking for updates. Previous baseline ID: [${previousId}], Newest fetched ID: [${latestId}]`);

    if (latestId !== previousId) {
      const newNotifs: DbNotification[] = [];
      for (const n of notifs) {
        if (n.id === previousId) break;
        if (!n.read) {
          newNotifs.push(n);
        }
      }

      console.log(`ℹ️ handleNewNotifications: Found ${newNotifs.length} new unread notifications since baseline.`);

      if (newNotifs.length > 0) {
        playPing();
        const newestUnread = newNotifs[0];
        console.log(`🎯 handleNewNotifications: Alerting for newest unread notification [${newestUnread.id}]: "${newestUnread.title}"`);
        triggerToast(`${newestUnread.title} - ${newestUnread.message}`);
      }

      lastSeenNotifIdRef.current = latestId;
    }
  }, []);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const today = new Date().toISOString().split('T')[0];

  const refreshNotificationsOnly = async () => {
    try {
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs || []);
        handleNewNotifications(notifs || []);
      }
    } catch {}
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, notifRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/notifications')
      ]);

      if (apptRes.ok) {
        const all = await apptRes.json();
        setAllBookings(all);
        setBookings(all.filter((b: Booking) => b.date === today));
      }

      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs || []);
        handleNewNotifications(notifs || []);
      }
    } finally {
      setLoading(false);
    }
  }, [today, handleNewNotifications]);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      refresh();
    }, 8000);
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
      return data;
    }
  };

  const markNotifRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    });
    refreshNotificationsOnly();
  };

  const markAllNotifRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    refreshNotificationsOnly();
    triggerToast('All notifications marked as read');
  };

  const clearNotifs = async () => {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_all' }),
    });
    if (res.ok) {
      refreshNotificationsOnly();
      triggerToast('Notification history cleared');
    } else {
      const data = await res.json();
      alert(data.error || 'Only doctor can clear history log');
    }
  };

  const unreadNotifs = notifications.filter(n => !n.read);

  const logout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    onLogout();
  };

  return (
    <div className="h-screen w-full bg-[#F4F6F8] font-sans flex flex-row overflow-hidden select-text">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Floating Open Handle on Left Edge when Desktop Sidebar is Collapsed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 bg-[#0B1B29] text-white p-2.5 rounded-r-2xl shadow-2xl hover:bg-[#1B4F72] transition-all z-40 items-center justify-center border-y border-r border-white/20 group cursor-pointer"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-5 h-5 text-emerald-300 group-hover:scale-125 transition-transform" />
        </button>
      )}

      {/* Left Attached Sidebar */}
      <aside
        className={`
          fixed lg:static top-0 bottom-0 left-0 h-full z-40 lg:z-30
          bg-gradient-to-b from-[#F0F4F8] via-[#E8EEF5] to-[#F3F7FA] border-r border-slate-200/90 flex flex-col justify-between
          transition-all duration-300 ease-in-out shadow-xl lg:shadow-none shrink-0
          ${sidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-none'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* 1. Sidebar Top Header (Branding + Collapse button) */}
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0B1B29] to-[#1B4F72] text-white flex items-center justify-center font-serif font-black text-lg shadow-md shrink-0">
                S
              </div>
              <div className="min-w-0">
                <h2 className="font-playfair text-sm font-bold text-slate-900 leading-tight truncate">
                  Skin Hub Clinic
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    STAFF PANEL
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg bg-slate-200/60 hover:bg-slate-300/80 text-slate-600 hover:text-slate-900 transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Mode Switcher Pill Control (Light Blue Theme) */}
          <div className="p-3 border-b border-slate-200/70 bg-slate-200/40 shrink-0">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5 px-1">
              Admin Panel Mode
            </div>
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300/50">
              <button
                onClick={() => setTab('queue')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  tab !== 'telemedicine'
                    ? 'bg-white text-[#0B1B29] shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>OPD Queue</span>
              </button>
              <button
                onClick={() => setTab('telemedicine')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'telemedicine'
                    ? 'bg-white text-[#0B1B29] shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-blue-600" />
                <span>Tele Consult</span>
              </button>
            </div>
          </div>

          {/* 3. Sidebar Navigation Items with Categories & Accordions */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Category: HOME */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                  HOME
                </span>
              </div>

              {/* Accordion Group: OPD Operations */}
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => toggleGroup('opd')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-extrabold text-slate-800 hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>OPD Operations</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      expandedGroups.opd ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedGroups.opd && (
                  <div className="pl-4 space-y-1 border-l-2 border-slate-300 ml-3.5">
                    <button
                      onClick={() => {
                        setTab('queue');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'queue' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'queue' ? 'text-emerald-400' : 'text-slate-400'}`}>•</span> Live Queue
                      </span>
                      {tab === 'queue' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setTab('schedule');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'schedule' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'schedule' ? 'text-emerald-400' : 'text-slate-400'}`}>•</span> Today's Schedule
                      </span>
                      {tab === 'schedule' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setTab('requests');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'requests' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'requests' ? 'text-emerald-400' : 'text-slate-400'}`}>•</span> Walk-in Requests
                      </span>
                      {tab === 'requests' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category: PATIENT SERVICES */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-sky-500 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                  PATIENT SERVICES
                </span>
              </div>

              <div className="mt-1 space-y-1">
                <button
                  onClick={() => toggleGroup('consult')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-extrabold text-slate-800 hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-4 h-4 text-sky-600" />
                    <span>Online Consultations</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      expandedGroups.consult ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedGroups.consult && (
                  <div className="pl-4 space-y-1 border-l-2 border-slate-300 ml-3.5">
                    <button
                      onClick={() => {
                        setTab('telemedicine');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'telemedicine' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'telemedicine' ? 'text-emerald-400' : 'text-slate-400'}`}>•</span> Video Appointments
                      </span>
                      {tab === 'telemedicine' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Sidebar Footer */}
          <div className="p-3 border-t border-slate-200/80 bg-white/60 backdrop-blur-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Skin Hub Admin v2.0</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 underline"
            >
              Hide
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace attached seamlessly to the right of the sidebar */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#F4F6F8]">
        {/* Content Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200/90 px-4 sm:px-6 py-3 flex justify-between items-center shadow-xs">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors focus:outline-none flex items-center gap-1.5"
                title="Show Sidebar"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div>
                <h1 className="font-playfair text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  {tab === 'queue' && 'Live Queue Management'}
                  {tab === 'schedule' && "Today's Schedule & Arrivals"}
                  {tab === 'requests' && 'Patient Self-Checkin Requests'}
                  {tab === 'telemedicine' && 'Online Video Consultations'}
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Reception & OPD Operations Console</p>
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
              onClick={() => setNotifTrayOpen(true)} 
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all relative focus:outline-none"
              aria-label="View notifications"
              title="View Alerts"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                  {unreadNotifs.length}
                </span>
              )}
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

        {/* Main Content Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
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
              role="staff"
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

      {/* Sliding Drawer Pane for Notifications */}
      <AnimatePresence>
        {notifTrayOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifTrayOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 bottom-0 right-0 w-80 bg-white z-50 p-6 flex flex-col justify-between shadow-2xl border-l select-text"
            >
              <div className="flex-1 flex flex-col min-h-0">
                
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-primary" />
                    <h3 className="font-playfair text-base font-black text-gray-900">Recent Notifications</h3>
                  </div>
                  <button onClick={() => setNotifTrayOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Notifications list */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-bold text-xs">No alerts received.</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 border rounded-xl text-xs space-y-1 relative transition-all ${
                          notif.read ? 'bg-white text-gray-500' : 'bg-primary/5 text-gray-800 border-primary/20 shadow-xs'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold leading-tight">{notif.title}</span>
                          {!notif.read && (
                            <button 
                              onClick={() => markNotifRead(notif.id)}
                              className="text-[9px] font-bold text-primary hover:underline shrink-0"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-650 font-semibold leading-relaxed">{notif.message}</p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase">{new Date(notif.createdAt).toLocaleTimeString()}</p>
                      </div>
                    ))
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t space-y-2">
                <button
                  onClick={markAllNotifRead}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] uppercase tracking-wider rounded-lg outline-none"
                >
                  Mark All as Read
                </button>
                <button
                  onClick={clearNotifs}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] uppercase tracking-wider rounded-lg outline-none"
                >
                  Clear History Log
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating toast alerts */}
      {msg && (
        <div className="fixed bottom-6 right-6 z-[99999] max-w-sm animate-fade-in-up">
          <div className="p-4 bg-white/80 backdrop-blur-xl border border-gray-150 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-black text-gray-900">Alert Notification</p>
              <p className="text-[11px] text-gray-650 font-semibold mt-0.5 leading-relaxed">{msg}</p>
            </div>
            <button onClick={() => setMsg('')} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg ml-auto shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


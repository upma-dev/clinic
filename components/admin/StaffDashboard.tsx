'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut, Menu, Clock, UserPlus, Calendar, Inbox, Video,
  RefreshCw, ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, X, Bell, CheckCircle,
  Lock, CalendarDays, Plus, Save, Loader2, DollarSign, AlertCircle, Eye
} from 'lucide-react';
import WalkInForm from './WalkInForm';
import QueueControls from './QueueControls';
import AppointmentsList from './AppointmentsList';

import TelemedicineAdmin from './TelemedicineAdmin';
import type { Booking, DailyQueue, QueueEntry, DbNotification, ClinicSettings } from '@/lib/types';
import { minutesToTime } from '@/lib/slots';

type StaffTab = 'queue' | 'walkin' | 'schedule' | 'clinic-schedule' | 'online-schedule' | 'booking-rules' | 'telemedicine';

interface StaffDashboardProps {
  onLogout: () => void;
}

const getInitialStaffTab = (): StaffTab => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab') as StaffTab;
    const validTabs: StaffTab[] = ['queue', 'walkin', 'schedule', 'clinic-schedule', 'online-schedule', 'booking-rules', 'telemedicine'];
    if (urlTab && validTabs.includes(urlTab)) return urlTab;
    const savedTab = localStorage.getItem('staff_active_tab') as StaffTab;
    if (savedTab && validTabs.includes(savedTab)) return savedTab;
  }
  return 'queue';
};

const getInitialRulesSubTab = (): 'slots' | 'schedule' | 'block' => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlSubTab = params.get('subTab') as any;
    const validSubTabs = ['slots', 'schedule', 'block'];
    if (urlSubTab && validSubTabs.includes(urlSubTab)) return urlSubTab;
    const savedSubTab = localStorage.getItem('staff_rules_subtab') as any;
    if (savedSubTab && validSubTabs.includes(savedSubTab)) return savedSubTab;
  }
  return 'slots';
};

export default function StaffDashboard({ onLogout }: StaffDashboardProps) {
  const [tab, setTab] = useState<StaffTab>(getInitialStaffTab);
  const [rulesSubTab, setRulesSubTab] = useState<'slots' | 'schedule' | 'block'>(getInitialRulesSubTab);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [daily, setDaily] = useState<DailyQueue | null>(null);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    offline: true,
    online: true,
  });

  // Slot blocker inspector states
  const todayStr = new Date().toISOString().split('T')[0];
  const [inspectorDate, setInspectorDate] = useState<string>(todayStr);
  const [dateBookings, setDateBookings] = useState<Booking[]>([]);
  const [fetchingDateBookings, setFetchingDateBookings] = useState(false);
  const [hourFilter, setHourFilter] = useState<'all' | '11-12' | '12-1' | '1-2' | '2-3'>('all');
  const [slotViewFormat, setSlotViewFormat] = useState<'cmd' | 'cards'>('cmd');
  const [showCustomBlockForm, setShowCustomBlockForm] = useState(false);
  const [blockDateInput, setBlockDateInput] = useState(todayStr);
  const [blockTimeInput, setBlockTimeInput] = useState('');

  // Sync active tab with URL & localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('staff_active_tab', tab);
      localStorage.setItem('staff_rules_subtab', rulesSubTab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (tab === 'booking-rules') {
        url.searchParams.set('subTab', rulesSubTab);
      } else {
        url.searchParams.delete('subTab');
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [tab, rulesSubTab]);

  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [notifTrayOpen, setNotifTrayOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const lastSeenNotifIdRef = React.useRef<string | null>(null);
  const isFirstLoadRef = React.useRef(true);

  const triggerToast = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 8000);
  };

  const playPing = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.warn);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewNotifications = useCallback((notifs: DbNotification[]) => {
    if (!notifs || notifs.length === 0) {
      lastSeenNotifIdRef.current = null;
      isFirstLoadRef.current = false;
      return;
    }

    const latestNotif = notifs[0];
    const latestId = latestNotif.id;

    if (isFirstLoadRef.current) {
      lastSeenNotifIdRef.current = latestId;
      isFirstLoadRef.current = false;
      return;
    }

    const previousId = lastSeenNotifIdRef.current;
    if (latestId !== previousId) {
      const newNotifs: DbNotification[] = [];
      for (const n of notifs) {
        if (n.id === previousId) break;
        if (!n.read) newNotifs.push(n);
      }

      if (newNotifs.length > 0) {
        playPing();
        const newestUnread = newNotifs[0];
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
      const [apptRes, notifRes, settingsRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/notifications'),
        fetch('/api/settings')
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

      if (settingsRes.ok) {
        const setts = await settingsRes.json();
        setSettings(setts);
      }
    } catch (err) {
      console.warn('Network error during StaffDashboard refresh:', err);
    } finally {
      setLoading(false);
    }
  }, [today, handleNewNotifications]);

  useEffect(() => {
    setIsInitialLoading(true);
    refresh().finally(() => setIsInitialLoading(false));
    const timer = setInterval(() => {
      refresh();
    }, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Fetch bookings for inspector date
  useEffect(() => {
    if (!inspectorDate) return;
    setFetchingDateBookings(true);
    fetch(`/api/appointments?date=${inspectorDate}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setDateBookings(data || []))
      .catch(console.error)
      .finally(() => setFetchingDateBookings(false));
  }, [inspectorDate]);

  const saveSettings = async (updatedSettings: Partial<ClinicSettings>) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setIsSavedSuccess(true);
        triggerToast('✅ Booking Rules & Slot Blocker updated live!');
        setTimeout(() => setIsSavedSuccess(false), 3000);
      } else {
        triggerToast('❌ Save settings failed');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      triggerToast('❌ Network error saving settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAction = async (
    id: string,
    action: string,
    nextScheduleDate?: string,
    rescheduleDate?: string,
    rescheduleTime?: string,
    rescheduleReason?: string,
    paymentMethod?: string
  ) => {
    try {
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
      if (res.ok) {
        const data = await res.json();
        await refresh();
        return data;
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Action failed.');
        await refresh();
      }
    } catch (err) {
      console.error('Error executing staff action:', err);
    }
  };

  const markNotifRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      refreshNotificationsOnly();
    } catch {}
  };

  const markAllNotifRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      refreshNotificationsOnly();
      triggerToast('All notifications marked as read');
    } catch {}
  };

  const clearNotifs = async () => {
    try {
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
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
    } catch {}
    onLogout();
  };

  const unreadNotifs = notifications.filter(n => !n.read);

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full bg-[#F4F6F8] font-sans flex items-center justify-center p-6 select-none">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto relative shadow-inner">
            <Clock className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h2 className="font-playfair text-xl font-black text-gray-900 leading-tight">
              Loading Reception & OPD Operations...
            </h2>
            <p className="text-xs text-gray-500 font-semibold">
              Fetching active OPD queue, patient bookings, and slot configurations for Staff Console.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full animate-pulse w-3/4"></div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Please wait a moment
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F4F6F8] font-sans flex flex-row overflow-hidden select-text">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Floating Open Handle when Desktop Sidebar is Collapsed */}
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
          {/* 1. Sidebar Top Header */}
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                {settings?.clinicLogo ? (
                  <img src={settings.clinicLogo} alt={settings?.clinicName || 'Clinic Logo'} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-serif font-black text-lg text-[#0B1B29]">
                    {settings?.clinicName?.charAt(0) || 'S'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-playfair text-sm font-bold text-slate-900 leading-tight truncate">
                  {settings?.clinicName || 'Skin Hub Clinic'}
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

          {/* 2. Mode Switcher Pill Control */}
          <div className="p-3 border-b border-slate-200/70 bg-slate-200/40 shrink-0">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1.5 px-1">
              Admin Console Mode
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

          {/* 3. Sidebar Navigation Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Category: OPD & RECEPTION */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
                  OPD & RECEPTION
                </span>
              </div>

              {/* Submenu 1: Offline / Clinic Patients */}
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => toggleGroup('offline')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-extrabold text-slate-800 hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Offline / Clinic Patients</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      expandedGroups.offline ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedGroups.offline && (
                  <div className="pl-4 space-y-1 border-l-2 border-emerald-400 ml-3.5">
                    <button
                      onClick={() => {
                        setTab('queue');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
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
                        setTab('clinic-schedule');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'clinic-schedule' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'clinic-schedule' ? 'text-emerald-400' : 'text-slate-400'}`}>•</span> Today's Schedule & Records
                      </span>
                      {tab === 'clinic-schedule' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setTab('walkin');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'walkin' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'walkin' ? 'text-emerald-400' : 'text-slate-400'}`}>•</span> Walk-in Registration
                      </span>
                      {tab === 'walkin' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setTab('booking-rules');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'booking-rules' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'booking-rules' ? 'text-emerald-400' : 'text-slate-400'}`}>•</span> Slot Blocker & Rules
                      </span>
                      {tab === 'booking-rules' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Submenu 2: Online Patients */}
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => toggleGroup('online')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-extrabold text-slate-800 hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-4 h-4 text-sky-600" />
                    <span>Online Patients</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      expandedGroups.online ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedGroups.online && (
                  <div className="pl-4 space-y-1 border-l-2 border-sky-400 ml-3.5">
                    <button
                      onClick={() => {
                        setTab('online-schedule');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'online-schedule' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'online-schedule' ? 'text-sky-400' : 'text-slate-400'}`}>•</span> Online Patient Queue
                      </span>
                      {tab === 'online-schedule' && <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setTab('telemedicine');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'telemedicine' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'telemedicine' ? 'text-sky-400' : 'text-slate-400'}`}>•</span> Online Appointments
                      </span>
                      {tab === 'telemedicine' && <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    </button>

                    <button
                      onClick={() => {
                        setTab('schedule');
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                        tab === 'schedule' ? 'bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] text-white shadow-md' : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`font-bold ${tab === 'schedule' ? 'text-sky-400' : 'text-slate-400'}`}>•</span> Online Consultation Records
                      </span>
                      {tab === 'schedule' && <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Floating App Bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div>
                <h1 className="font-playfair text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  {tab === 'queue' && 'Live Queue Management'}
                  {tab === 'walkin' && 'Walk-in Registration'}
                  {tab === 'schedule' && "All Patient Records & Today's Schedule"}
                  {tab === 'clinic-schedule' && "Clinic OPD Visit Patients List"}
                  {tab === 'online-schedule' && "Online Video Consultation Patients List"}
                  {tab === 'booking-rules' && 'Slot Blocker & Booking Rules'}
                  {tab === 'telemedicine' && 'Online Video Consultations Console'}
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
              initialFilter="all"
            />
          )}

          {tab === 'clinic-schedule' && (
            <AppointmentsList
              bookings={allBookings}
              loading={loading}
              onAction={handleAction}
              onRefresh={refresh}
              role="staff"
              initialFilter="offline"
            />
          )}

          {tab === 'online-schedule' && (
            <AppointmentsList
              bookings={allBookings}
              loading={loading}
              onAction={handleAction}
              onRefresh={refresh}
              role="staff"
              initialFilter="online"
            />
          )}

          {tab === 'booking-rules' && (
            <div className="space-y-6">
              {/* Notice Banner explaining staff permissions */}
              <div className="p-4 bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] rounded-2xl text-white shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-playfair font-bold text-sm">OPD Slot Blocker & Timing Controls</h3>
                    <p className="text-[11px] text-gray-300">
                      Manage patient consultation duration (3-min standard), emergency date blocks, and session timings live. Fee pricing editing is restricted to Doctor account.
                    </p>
                  </div>
                </div>

                {settings && (
                  <button
                    type="button"
                    disabled={isSavingSettings}
                    onClick={() => saveSettings(settings)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-md"
                  >
                    {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                )}
              </div>

              {/* Sub-Tab Navigation Header */}
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-2xs gap-1">
                <button
                  type="button"
                  onClick={() => setRulesSubTab('slots')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rulesSubTab === 'slots'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Slot Duration
                </button>
                <button
                  type="button"
                  onClick={() => setRulesSubTab('schedule')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rulesSubTab === 'schedule'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" /> OPD Timings
                </button>
                <button
                  type="button"
                  onClick={() => setRulesSubTab('block')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    rulesSubTab === 'block'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Slot & Date Blocker
                </button>
              </div>

              {!settings ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-xs font-bold text-gray-700">Loading consultation rules...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SUB-TAB 1: Slot Duration */}
                  {rulesSubTab === 'slots' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-playfair font-bold text-base text-gray-900">Consultation Duration Rules</h3>
                            <p className="text-[10px] text-gray-500 font-semibold">Set patient consultation duration (standard 3-minute slot window)</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-800">
                            Consultation Time Per Patient (Minutes)
                          </label>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                            ⚡ {settings.slotDurationMinutes || 3} Mins ({Math.floor(60 / (settings.slotDurationMinutes || 3))} slots/hour)
                          </span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                          {[3, 4, 5, 10, 15, 20, 30].map((mins) => (
                            <button
                              type="button"
                              key={mins}
                              onClick={() => {
                                const updated = { ...settings, onlineSlotDuration: mins, slotDurationMinutes: mins };
                                setSettings(updated);
                                saveSettings({ onlineSlotDuration: mins, slotDurationMinutes: mins });
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                (settings.slotDurationMinutes || 3) === mins
                                  ? 'bg-primary text-white border-primary shadow-xs'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {mins} Mins
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: OPD Timings */}
                  {rulesSubTab === 'schedule' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-playfair font-bold text-base text-gray-900">OPD Session Timings & Working Days</h3>
                          <p className="text-[10px] text-gray-500 font-semibold">Session hours & open days for clinic queue</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-800 block">OPD Session Timings (24-Hour Format)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                            <span className="text-xs font-bold text-gray-700 block">Morning Session</span>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={settings.morningStart || '09:00'}
                                onChange={(e) => setSettings({ ...settings, morningStart: e.target.value })}
                                placeholder="09:00"
                                className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                              />
                              <span className="text-gray-400 font-bold text-xs">-</span>
                              <input
                                type="text"
                                value={settings.morningEnd || '14:00'}
                                onChange={(e) => setSettings({ ...settings, morningEnd: e.target.value })}
                                placeholder="14:00"
                                className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                              />
                            </div>
                          </div>

                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                            <span className="text-xs font-bold text-gray-700 block">Evening Session</span>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={settings.eveningStart || '17:00'}
                                onChange={(e) => setSettings({ ...settings, eveningStart: e.target.value })}
                                placeholder="17:00"
                                className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                              />
                              <span className="text-gray-400 font-bold text-xs">-</span>
                              <input
                                type="text"
                                value={settings.eveningEnd || '21:00'}
                                onChange={(e) => setSettings({ ...settings, eveningEnd: e.target.value })}
                                placeholder="21:00"
                                className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: Slot Blocker */}
                  {rulesSubTab === 'block' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-playfair font-bold text-base text-gray-900">Date & Time Slot Blocker</h3>
                            <p className="text-[10px] text-gray-500 font-semibold">Pause specific time slots or block emergency dates</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {fetchingDateBookings && (
                            <span className="text-[11px] font-bold text-purple-700 flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 animate-pulse">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                              <span>Loading Date...</span>
                            </span>
                          )}
                          <input
                            type="date"
                            value={inspectorDate}
                            onChange={(e) => setInspectorDate(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none focus:border-primary cursor-pointer shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Hourly Slot Interactive List */}
                      <div className="space-y-3 font-sans">
                        <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
                          <span>Slots for {inspectorDate}:</span>
                          <span className="text-[10px] font-semibold text-gray-500">Click any slot to block/unblock</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {(() => {
                            const duration = settings.slotDurationMinutes || 3;
                            const slots: string[] = [];
                            for (let m = 660; m < 840; m += duration) {
                              slots.push(minutesToTime(m));
                            }
                            return slots.map(timeStr => {
                              const isCustomBlocked = (settings.blockedSlots || []).some(
                                b => b.date === inspectorDate && b.time === timeStr
                              );
                              const patientBooking = dateBookings.find(
                                b => b.date === inspectorDate && b.time === timeStr && b.status !== 'cancelled'
                              );

                              return (
                                <button
                                  type="button"
                                  key={timeStr}
                                  disabled={!!patientBooking}
                                  onClick={() => {
                                    const current = settings.blockedSlots || [];
                                    let updated = current;
                                    if (isCustomBlocked) {
                                      updated = current.filter(b => !(b.date === inspectorDate && b.time === timeStr));
                                      triggerToast(`🟢 Slot ${timeStr} unblocked`);
                                    } else {
                                      updated = [...current, { date: inspectorDate, time: timeStr }];
                                      triggerToast(`🚫 Slot ${timeStr} blocked`);
                                    }
                                    setSettings({ ...settings, blockedSlots: updated });
                                    saveSettings({ blockedSlots: updated });
                                  }}
                                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                                    patientBooking
                                      ? 'bg-blue-600 text-white border-blue-600 opacity-90'
                                      : isCustomBlocked
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                  }`}
                                >
                                  {patientBooking ? `👤 ${timeStr}` : isCustomBlocked ? `🚫 ${timeStr}` : `🟢 ${timeStr}`}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'telemedicine' && (
            <div className="max-w-4xl mx-auto">
              <TelemedicineAdmin role="staff" />
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
                <div className="flex justify-between items-center pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-primary" />
                    <h3 className="font-playfair text-base font-black text-gray-900">Recent Notifications</h3>
                  </div>
                  <button onClick={() => setNotifTrayOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

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

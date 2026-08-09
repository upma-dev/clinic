'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LogOut, PlusCircle, Trash2, BookOpen, Settings, Bell, Menu, X, Edit, 
  Eye, FileText, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, PanelLeftClose, ShieldCheck, RefreshCw, Plus, Save,
  Users, DollarSign, Calendar, Clock, Lock, Upload, Sparkles, HelpCircle,
  Briefcase, Image as ImageIcon, AlertCircle, Search, Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AppointmentsList from './AppointmentsList';
import QueueControls from './QueueControls';
import DoctorTelemedicineView from '../doctor/DoctorTelemedicineView';
import type { Booking, ClinicSettings, BlogPost, CMSContent, DbNotification, DailyQueue, QueueEntry } from '@/lib/types';

interface DoctorDashboardProps {
  onLogout: () => void;
}

type DoctorTab = 'overview' | 'queue' | 'prepaid' | 'settings' | 'booking-rules' | 'blogs' | 'cms' | 'telemedicine';

export default function DoctorDashboard({ onLogout }: DoctorDashboardProps) {
  const [tab, setTab] = useState<DoctorTab>('overview');
  const [telemedicineStage, setTelemedicineStage] = useState<'confirmed' | 'pending' | 'completed' | 'all'>('confirmed');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    clinic: true,
    content: true,
    consult: true,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [daily, setDaily] = useState<DailyQueue | null>(null);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  
  // Settings & CMS States
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [cms, setCms] = useState<CMSContent | null>(null);
  
  // Blog Management States
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogTotal, setBlogTotal] = useState(0);
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('All');
  const [blogPage, setBlogPage] = useState(1);
  const [blogFormMode, setBlogFormMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState<Partial<BlogPost>>({
    title: '',
    summary: '',
    content: '',
    category: 'Aesthetic Care',
    tags: [],
    status: 'draft',
    featured: false,
    seoTitle: '',
    seoDescription: '',
    readTime: '3 min read',
    imageUrl: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [blogPreviewMode, setBlogPreviewMode] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [notifTrayOpen, setNotifTrayOpen] = useState(false);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Quick Action Toggles
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load configs and data
  const refresh = useCallback(async () => {
    try {
      const [apptRes, allApptRes, settingsRes, cmsRes, blogRes, notifRes, queueRes] = await Promise.all([
        fetch(`/api/appointments?date=${today}`),
        fetch('/api/appointments'),
        fetch('/api/settings'),
        fetch('/api/cms'),
        fetch(`/api/blogs?admin=true&search=${blogSearch}&category=${blogCategoryFilter}&page=${blogPage}&limit=10`),
        fetch('/api/notifications'),
        fetch(`/api/queue?date=${today}`)
      ]);

      if (apptRes.ok) {
        const data = await appapptRes(apptRes);
        setBookings(data.filter((b: Booking) => b.date === today));
      }
      if (allApptRes.ok) {
        setAllBookings(await allApptRes.json());
      }
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
      if (cmsRes.ok) {
        setCms(await cmsRes.json());
      }
      if (blogRes.ok) {
        const blogData = await blogRes.json();
        setBlogs(blogData.posts || []);
        setBlogTotal(blogData.total || 0);
      }
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs || []);
        
        // Trigger notification sound if new notification arrives
        const unreadCount = notifs.filter((n: DbNotification) => !n.read).length;
        if (unreadCount > lastNotificationCount && lastNotificationCount > 0) {
          playPing();
        }
        setLastNotificationCount(unreadCount);
      }
      if (queueRes.ok) {
        const qData = await queueRes.json();
        setDaily(qData.daily);
        setEntries(qData.entries);
      }
    } catch (e) {
      console.error(e);
    }
  }, [today, blogSearch, blogCategoryFilter, blogPage, lastNotificationCount]);

  // Helper helper to format appt fetch
  const appapptRes = async (res: Response) => {
    return await res.json();
  };

  useEffect(() => {
    refresh();
    // Poll notifications every 8 seconds
    const interval = setInterval(() => {
      refreshNotificationsOnly();
    }, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  const refreshNotificationsOnly = async () => {
    try {
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs || []);
        const unreadCount = notifs.filter((n: DbNotification) => !n.read).length;
        if (unreadCount > lastNotificationCount && lastNotificationCount > 0) {
          playPing();
        }
        setLastNotificationCount(unreadCount);
      }
    } catch {}
  };

  const playPing = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
      }
      audioRef.current.volume = 0.3;
      audioRef.current.play();
    } catch {}
  };

  const triggerToast = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  // Logouts
  const logout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    onLogout();
  };

  // General POST setting updates
  const saveSettings = async (patch: Partial<ClinicSettings>) => {
    setLoading(true);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      triggerToast('Settings successfully updated');
      refresh();
    }
    setLoading(false);
  };

  // General CMS updates
  const saveCms = async (patch: Partial<CMSContent>) => {
    setLoading(true);
    const res = await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      triggerToast('Homepage CMS updated live');
      refresh();
    }
    setLoading(false);
  };

  // Image Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    triggerToast('Uploading image...');
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      callback(data.imageUrl);
      triggerToast('Image uploaded successfully');
    } else {
      triggerToast('Failed to upload image');
    }
  };

  // Notification Operations
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
    setConfirmModal({
      show: true,
      title: 'Clear Notifications',
      message: 'Are you sure you want to clear your notification history? This action is permanent and cannot be undone.',
      onConfirm: async () => {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear_all' }),
        });
        refreshNotificationsOnly();
      }
    });
  };

  // Blog Management CRUDs
  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.summary || !blogForm.content) {
      alert('Title, Summary and Content are required!');
      return;
    }

    const payload = {
      action: blogFormMode === 'create' ? 'create' : 'update',
      id: activeBlogId,
      blog: {
        ...blogForm,
        author: settings?.clinicName ? `Dr. Prateek (${settings.clinicName})` : 'Dr. Prateek Tiwari',
        readTime: blogForm.readTime || '4 min read',
      }
    };

    const res = await fetch('/api/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      triggerToast(blogFormMode === 'create' ? 'Blog published successfully' : 'Blog post updated');
      setBlogFormMode('list');
      setBlogForm({
        title: '',
        summary: '',
        content: '',
        category: 'Aesthetic Care',
        tags: [],
        status: 'draft',
        featured: false,
        seoTitle: '',
        seoDescription: '',
        readTime: '3 min read',
        imageUrl: '',
      });
      setActiveBlogId(null);
      refresh();
    } else {
      alert('Error saving blog.');
    }
  };

  const initEditBlog = (post: BlogPost) => {
    setBlogForm({
      title: post.title,
      summary: post.summary,
      content: post.content,
      category: post.category,
      tags: post.tags || [],
      status: post.status || 'published',
      featured: !!post.featured,
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.summary,
      readTime: post.readTime,
      imageUrl: post.imageUrl || '',
    });
    setActiveBlogId(post.id);
    setBlogFormMode('edit');
  };

  const deleteBlog = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Blog Post',
      message: 'Are you sure you want to delete this blog post? This action is permanent and cannot be undone.',
      onConfirm: async () => {
        const res = await fetch('/api/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        });
        if (res.ok) {
          triggerToast('Blog deleted');
          refresh();
        }
      }
    });
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const currentTags = blogForm.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      setBlogForm({ ...blogForm, tags: [...currentTags, tagInput.trim()] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setBlogForm({
      ...blogForm,
      tags: (blogForm.tags || []).filter(t => t !== tag)
    });
  };

  // Dynamic Statistics Calculations
  const todayBookings = allBookings.filter(b => b.date === today && b.status !== 'cancelled');
  const onlineBookingsCount = todayBookings.filter(b => b.source === 'online').length;
  const offlineBookingsCount = todayBookings.filter(b => b.source === 'walk-in').length;
  const waitingPatientsCount = todayBookings.filter(b => b.status === 'arrived' || b.status === 'confirmed').length; // Waiting in lobby
  const completedConsultations = todayBookings.filter(b => b.status === 'completed').length;
  
  const todayRevenue = todayBookings.reduce((sum, b) => {
    if (b.paymentStatus === 'paid') return sum + (b.amountPaid || 200);
    return sum;
  }, 0);

  const pendingPaymentsCount = todayBookings.filter(b => b.paymentStatus !== 'paid' && b.status !== 'completed').length;
  
  // Notification states
  const unreadNotifs = notifications.filter(n => !n.read);

  // SVG Chart data points helper
  const renderMiniChart = () => {
    // Generate simple dynamic stats bars for the last 5 days
    const days = [4, 3, 2, 1, 0].map(offset => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return d.toISOString().split('T')[0];
    });

    const volumes = days.map(dStr => {
      return allBookings.filter(b => b.date === dStr && b.status !== 'cancelled').length;
    });

    const maxVol = Math.max(...volumes, 5);

    return (
      <div className="h-28 flex items-end justify-between gap-2 px-2 pt-4">
        {volumes.map((v, idx) => {
          const pct = (v / maxVol) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group">
              <div className="text-[10px] font-bold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {v}
              </div>
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="w-full bg-gradient-to-t from-primary to-accent rounded-t-lg min-h-[4px]"
              />
              <span className="text-[9px] font-bold text-gray-500 uppercase mt-2">
                {new Date(days[idx]).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const navItems = [
    { id: 'overview' as const, label: 'Dashboard', icon: <Users className="w-4 h-4" /> },
    { id: 'queue' as const, label: 'Queue Controls', icon: <Clock className="w-4 h-4" /> },
    { id: 'prepaid' as const, label: 'Pre-Paid', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'settings' as const, label: 'Clinic Profile', icon: <Settings className="w-4 h-4" /> },
    { id: 'booking-rules' as const, label: 'Booking Rules', icon: <Clock className="w-4 h-4" /> },
    { id: 'blogs' as const, label: 'Blog Manager', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'cms' as const, label: 'CMS Homepage', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'telemedicine' as const, label: 'Online Consultations', icon: <Video className="w-4 h-4" /> },
  ];

  if (loading && allBookings.length === 0) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] p-4 lg:p-8 space-y-6 animate-pulse select-none font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center pb-4 border-b border-gray-200">
            <div className="space-y-2">
              <div className="h-8 w-60 bg-gray-200 rounded-xl"></div>
              <div className="h-4 w-80 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded-2xl"></div>
            <div className="h-24 bg-gray-200 rounded-2xl"></div>
            <div className="h-24 bg-gray-200 rounded-2xl"></div>
            <div className="h-24 bg-gray-200 rounded-2xl"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F4F6F8] font-sans flex flex-row overflow-hidden select-text">
      
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

      {/* Sidebar for Desktop */}
      <aside
        className={`
          hidden lg:flex flex-col h-full z-30
          bg-[#0B1B29] text-white border-r border-[#1B2D3D] flex-col justify-between
          transition-all duration-300 ease-in-out shadow-2xl shrink-0
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 overflow-hidden border-none -translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* 1. Sidebar Top Header (Branding + Collapse button) */}
          <div className="p-4 border-b border-[#1B2D3D] flex items-center justify-between bg-[#0B1B29] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-serif font-black text-xl shadow-lg shrink-0">
                {settings?.clinicName?.charAt(0) || 'S'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 leading-none">
                    SYSTEM ADMIN
                  </span>
                </div>
                <h2 className="font-playfair font-bold text-sm text-white mt-1 leading-tight truncate">
                  {settings?.clinicName || 'Skin Hub'}
                </h2>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Mode Switcher Pill Control (Image 1 style) */}
          <div className="p-3 border-b border-[#1B2D3D] bg-[#07131E] shrink-0">
            <div className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5 px-1">
              Admin Console Mode
            </div>
            <div className="bg-[#112334] p-1 rounded-xl flex items-center gap-1 border border-white/5">
              <button
                onClick={() => setTab('overview')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tab !== 'telemedicine'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Console</span>
              </button>
              <button
                onClick={() => setTab('telemedicine')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tab === 'telemedicine'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Consults</span>
              </button>
            </div>
          </div>

          {/* 3. Sidebar Navigation Items with Categories & Accordions */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Category: HOME */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  HOME
                </span>
              </div>
              <button
                onClick={() => setTab('overview')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                  tab === 'overview'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Administrative Console</span>
                </div>
              </button>
            </div>

            {/* Category: CLINIC MANAGEMENT */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-teal-400 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  CLINIC MANAGEMENT
                </span>
              </div>

              <div className="mt-1 space-y-1">
                <button
                  onClick={() => toggleGroup('clinic')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>Clinic Operations</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      expandedGroups.clinic ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedGroups.clinic && (
                  <div className="pl-4 space-y-1 border-l-2 border-teal-500/30 ml-3.5">
                    {[
                      { id: 'queue' as const, label: 'Queue Controls', icon: <Clock className="w-3.5 h-3.5" /> },
                      { id: 'prepaid' as const, label: 'Pre-Paid Log', icon: <DollarSign className="w-3.5 h-3.5" /> },
                      { id: 'settings' as const, label: 'Clinic Profile', icon: <Settings className="w-3.5 h-3.5" /> },
                      { id: 'booking-rules' as const, label: 'Booking Rules', icon: <Clock className="w-3.5 h-3.5" /> },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setTab(sub.id)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                          tab === sub.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={tab === sub.id ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                          {sub.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category: CONTENT MANAGEMENT */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-sky-400 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  CONTENT MANAGEMENT
                </span>
              </div>

              <div className="mt-1 space-y-1">
                <button
                  onClick={() => toggleGroup('content')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span>Editorial & Homepage</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      expandedGroups.content ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedGroups.content && (
                  <div className="pl-4 space-y-1 border-l-2 border-sky-500/30 ml-3.5">
                    {[
                      { id: 'blogs' as const, label: 'Blog Manager', icon: <BookOpen className="w-3.5 h-3.5" /> },
                      { id: 'cms' as const, label: 'CMS Homepage', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setTab(sub.id)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                          tab === sub.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={tab === sub.id ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                          {sub.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category: CONSULTATIONS */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-indigo-400 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  CONSULTATIONS
                </span>
              </div>

              <div className="mt-1 space-y-1">
                <button
                  onClick={() => toggleGroup('consult')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-4 h-4 text-indigo-400" />
                    <span>Online Video Consults</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      expandedGroups.consult ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedGroups.consult && (
                  <div className="pl-4 space-y-1 border-l-2 border-indigo-500/30 ml-3.5">
                    <button
                      onClick={() => setTab('telemedicine')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all ${
                        tab === 'telemedicine'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'telemedicine' ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                        Video Portal
                      </span>
                    </button>

                    {tab === 'telemedicine' && (
                      <div className="pl-3 space-y-1 pt-1">
                        {[
                          { stage: 'confirmed' as const, label: '📅 Confirmed' },
                          { stage: 'pending' as const, label: '⏳ Pending Review' },
                          { stage: 'completed' as const, label: '✅ Completed' },
                          { stage: 'all' as const, label: '📋 All Consultations' },
                        ].map((sub) => (
                          <button
                            key={sub.stage}
                            onClick={() => setTelemedicineStage(sub.stage)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                              telemedicineStage === sub.stage
                                ? 'bg-emerald-400/20 text-emerald-300'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Sidebar Footer */}
          <div className="p-4 border-t border-[#1B2D3D] bg-[#07131E] flex items-center justify-between shrink-0">
            <button
              onClick={logout}
              className="w-full px-3 py-2 rounded-xl flex items-center gap-2.5 font-sans text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/10 transition-colors outline-none"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#0B1B29] text-white px-4 py-3.5 flex justify-between items-center shadow-lg border-b border-[#1B2D3D]">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <span className="font-playfair text-base font-black truncate max-w-[150px]">
            {settings?.clinicName || 'Skin Hub'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setNotifTrayOpen(true)} 
            className="p-2 bg-white/10 rounded-full relative"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-600 border-2 border-[#0B1B29] flex items-center justify-center text-[8px] font-bold text-white">
                {unreadNotifs.length}
              </span>
            )}
          </button>
          <button 
            onClick={logout} 
            className="p-2 bg-white/10 rounded-full hover:bg-rose-500/20"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Sidebar) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-64 bg-[#0B1B29] text-white z-50 p-6 flex flex-col justify-between shadow-2xl border-r border-[#1B2D3D]"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-[#1B2D3D]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-lg">
                      {settings?.clinicName?.charAt(0) || 'S'}
                    </div>
                    <span className="font-playfair text-sm font-bold">{settings?.clinicName || 'Skin Hub'}</span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 font-sans text-xs font-bold uppercase tracking-wider transition-all outline-none ${
                        tab === item.id 
                          ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#1B2D3D]">
                <button
                  onClick={logout}
                  className="w-full px-4 py-3 rounded-xl flex items-center gap-3 font-sans text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/10 transition-colors outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace Right Container with Independent Vertical Scroll */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-[#F4F6F8]">
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Header Row for Desktop */}
        <div className="hidden lg:flex justify-between items-center pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors shadow-xs"
                title="Show Sidebar"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
            )}
            <div>
              <h1 className="font-playfair text-2.5xl font-black text-gray-900 leading-tight">
                {tab === 'overview' && 'Administrative Console'}
                {tab === 'queue' && 'Queue Management Board'}
                {tab === 'prepaid' && 'Online Pre-paid Log'}
                {tab === 'settings' && 'Clinic Configuration'}
                {tab === 'booking-rules' && 'Appointment Scheduler Toggles'}
                {tab === 'blogs' && 'Dermatology Editorial Library'}
                {tab === 'cms' && 'Dynamic Homepage Blocks'}
                {tab === 'telemedicine' && 'Online Video Consultations'}
              </h1>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Welcome back, Doctor. Manage active patients, clinic rules, blogs, and layouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setNotifTrayOpen(true)}
              className="p-2.5 bg-white border rounded-xl shadow-xs relative hover:bg-gray-55 outline-none transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-600 border border-white flex items-center justify-center text-[9px] font-bold text-white leading-none">
                  {unreadNotifs.length}
                </span>
              )}
            </button>
            <div className="h-8 w-[1px] bg-gray-200" />
            <button 
              onClick={refresh}
              className="p-2.5 bg-white border rounded-xl shadow-xs hover:bg-gray-55 outline-none transition-all hover:rotate-180"
              title="Refresh console"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>



        {/* Content Tabs Switcher */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* OVERVIEW PANEL */}
            {tab === 'overview' && (
              <div className="space-y-6">
                
                {/* Statistics Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Today's Appointments Card */}
                  <div className="bg-white border rounded-2xl p-5 shadow-xs flex items-start justify-between hover:shadow-md transition-all duration-300">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block">Today's Bookings</span>
                      <h3 className="font-playfair text-2.5xl font-extrabold text-gray-900 leading-none">{todayBookings.length}</h3>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        {onlineBookingsCount} Online • {offlineBookingsCount} Walk-ins
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Patients Waiting Card */}
                  <div className="bg-white border rounded-2xl p-5 shadow-xs flex items-start justify-between hover:shadow-md transition-all duration-300">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block">Patients Waiting</span>
                      <h3 className="font-playfair text-2.5xl font-extrabold text-[#F39C12] leading-none">{waitingPatientsCount}</h3>
                      <p className="text-[10px] text-gray-500 font-semibold">In active clinic queue</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#FEF9E7] text-[#F39C12] flex items-center justify-center shadow-inner shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Today's Consultations Completed */}
                  <div className="bg-white border rounded-2xl p-5 shadow-xs flex items-start justify-between hover:shadow-md transition-all duration-300">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block">Completed Sessions</span>
                      <h3 className="font-playfair text-2.5xl font-extrabold text-teal-600 leading-none">{completedConsultations}</h3>
                      <p className="text-[10px] text-gray-500 font-semibold">Ready & discharged</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Revenue Card */}
                  <div className="bg-white border rounded-2xl p-5 shadow-xs flex items-start justify-between hover:shadow-md transition-all duration-300">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block">Today's Revenue</span>
                      <h3 className="font-playfair text-2.5xl font-extrabold text-emerald-700 leading-none">₹{todayRevenue}</h3>
                      <p className="text-[10px] text-rose-500 font-semibold font-sans">{pendingPaymentsCount} Unpaid pending</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-inner shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>

                </div>

                {/* Main Full-Width Bookings List */}
                <div className="w-full space-y-4">
                  <AppointmentsList
                    bookings={allBookings}
                    loading={false}
                    onAction={async (id, action, nextScheduleDate, rescheduleDate, rescheduleTime, rescheduleReason) => {
                      const res = await fetch('/api/appointments/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          id, 
                          action, 
                          nextScheduleDate, 
                          newDate: rescheduleDate, 
                          newTime: rescheduleTime, 
                          reason: rescheduleReason 
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        triggerToast(`Action "${action}" completed`);
                        refresh();
                        return data; // returns { whatsappUrl } if available
                      }
                    }}
                    onRefresh={refresh}
                  />
                </div>

              </div>
            )}

            {/* QUEUE CONTROLS TAB */}
            {tab === 'queue' && (
              <QueueControls todayBookings={bookings} onUpdate={refresh} role="doctor" />
            )}

            {/* PRE-PAID LOG */}
            {tab === 'prepaid' && (
              <div className="bg-white border rounded-2xl shadow-xs overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="font-bold text-lg text-gray-900">Pre-Paid Online Logins</h3>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Skip billing queue directly. Generate Prescription directly.</p>
                </div>
                
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {allBookings.filter(b => b.paymentStatus === 'paid').length === 0 ? (
                    <div className="p-12 text-center text-gray-500 font-semibold">No paid records found.</div>
                  ) : (
                    allBookings.filter(b => b.paymentStatus === 'paid').map(b => (
                      <div key={b.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase">
                            Paid ₹{b.amountPaid || 500}
                          </span>
                          <h4 className="font-bold text-gray-900 mt-1.5">{b.name}</h4>
                          <p className="text-xs text-gray-500 font-semibold">{b.phone} • {b.date} at {b.time} for {b.service}</p>
                        </div>
                        <button
                          onClick={() => window.open(`/admin/prescription?patientId=${b.id}&type=clinic`, '_blank')}
                          className="px-4 py-2 bg-[#0B1B29] text-white text-xs font-bold uppercase tracking-wide rounded-lg flex items-center gap-1.5 hover:bg-primary transition-colors outline-none"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Write Rx
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CLINIC SETTINGS MANAGER */}
            {tab === 'settings' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-200 pb-4">
                  <div>
                    <h2 className="font-playfair text-2xl font-black text-gray-900">Clinic Profile & Operating Details</h2>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Customize clinic identity, consultation fees, and operational capacity. Updates take effect immediately.</p>
                  </div>
                  {settings && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveSettings(settings)}
                      className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:brightness-105 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-sm transition-all outline-none cursor-pointer shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  )}
                </div>

                {settings && (
                  <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
                    
                    {/* Card 1: Basic Clinic Identity */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-5 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-playfair font-bold text-base text-gray-900">General Clinic Identity</h3>
                          <p className="text-[10px] text-gray-500 font-semibold">Official name, phone, email, and clinic location</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Clinic Name *</label>
                          <input 
                            type="text"
                            required
                            value={settings.clinicName}
                            onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Phone Contact *</label>
                          <input 
                            type="text"
                            required
                            value={settings.clinicPhone}
                            onChange={(e) => setSettings({ ...settings, clinicPhone: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Email Address *</label>
                          <input 
                            type="email"
                            required
                            value={settings.clinicEmail}
                            onChange={(e) => setSettings({ ...settings, clinicEmail: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Physical Clinic Address *</label>
                        <input 
                          type="text"
                          required
                          value={settings.clinicAddress}
                          onChange={(e) => setSettings({ ...settings, clinicAddress: e.target.value })}
                          className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Card 2: Brand Logo Upload Dropzone Card */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-playfair font-bold text-base text-gray-900">Clinic Brand Logo</h3>
                          <p className="text-[10px] text-gray-500 font-semibold">Appears on patient portal header, PDF receipts, and prescription forms</p>
                        </div>
                      </div>

                      <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/60 flex items-center justify-between gap-4 flex-wrap hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
                            {settings.clinicLogo ? (
                              <img src={settings.clinicLogo} alt="Logo" className="w-12 h-12 object-contain" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">Upload High-Res Brand Symbol</p>
                            <p className="text-[10px] text-gray-500">Supports PNG, SVG, or JPG format (max 5MB)</p>
                          </div>
                        </div>

                        <label className="px-4 py-2.5 bg-white border border-gray-250 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2 transition-all">
                          <Upload className="w-4 h-4 text-primary" />
                          <span>Choose File</span>
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, (url) => setSettings({ ...settings, clinicLogo: url }))}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Card 3: Consultation Pricing Fees Cards */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-5 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-playfair font-bold text-base text-gray-900">Consultation Pricing Matrix (INR ₹)</h3>
                          <p className="text-[10px] text-gray-500 font-semibold">Standard consultation rates auto-applied during booking & payments</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        
                        <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Clinic Checkup Fee</span>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-black text-gray-400">₹</span>
                            <input 
                              type="number"
                              value={settings.consultationFee}
                              onChange={(e) => setSettings({ ...settings, consultationFee: Number(e.target.value) })}
                              className="w-full pl-8 pr-3 py-2 border rounded-xl text-sm font-bold text-gray-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Online Video Fee</span>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-black text-gray-400">₹</span>
                            <input 
                              type="number"
                              value={settings.onlineConsultationFee}
                              onChange={(e) => setSettings({ ...settings, onlineConsultationFee: Number(e.target.value) })}
                              className="w-full pl-8 pr-3 py-2 border rounded-xl text-sm font-bold text-gray-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Walk-in Offline Fee</span>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-black text-gray-400">₹</span>
                            <input 
                              type="number"
                              value={settings.offlineConsultationFee}
                              onChange={(e) => setSettings({ ...settings, offlineConsultationFee: Number(e.target.value) })}
                              className="w-full pl-8 pr-3 py-2 border rounded-xl text-sm font-bold text-gray-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="bg-gray-50/70 border border-gray-200/70 rounded-2xl p-4 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Emergency Fee</span>
                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-xs font-black text-gray-400">₹</span>
                            <input 
                              type="number"
                              value={settings.emergencyFee}
                              onChange={(e) => setSettings({ ...settings, emergencyFee: Number(e.target.value) })}
                              className="w-full pl-8 pr-3 py-2 border rounded-xl text-sm font-bold text-gray-900 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Card 4: Operating Capacity & Session Timings */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-5 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-playfair font-bold text-base text-gray-900">Capacity & Session Hours</h3>
                          <p className="text-[10px] text-gray-500 font-semibold">Set patient intake limits and OPD operational hours</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Max Patients / Hour</label>
                          <input 
                            type="number"
                            value={settings.maxPatientsPerHour}
                            onChange={(e) => setSettings({ ...settings, maxPatientsPerHour: Number(e.target.value) })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Max Daily Bookings</label>
                          <input 
                            type="number"
                            value={settings.maxBookingsPerDay}
                            onChange={(e) => setSettings({ ...settings, maxBookingsPerDay: Number(e.target.value) })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Morning Session Hours</label>
                          <div className="flex gap-1.5 items-center">
                            <input 
                              type="text" 
                              value={settings.morningStart} 
                              onChange={(e) => setSettings({ ...settings, morningStart: e.target.value })}
                              placeholder="09:00"
                              className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none"
                            />
                            <span className="text-gray-400 font-bold text-xs">-</span>
                            <input 
                              type="text" 
                              value={settings.morningEnd} 
                              onChange={(e) => setSettings({ ...settings, morningEnd: e.target.value })}
                              placeholder="14:00"
                              className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Evening Session Hours</label>
                          <div className="flex gap-1.5 items-center">
                            <input 
                              type="text" 
                              value={settings.eveningStart} 
                              onChange={(e) => setSettings({ ...settings, eveningStart: e.target.value })}
                              placeholder="17:00"
                              className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none"
                            />
                            <span className="text-gray-400 font-bold text-xs">-</span>
                            <input 
                              type="text" 
                              value={settings.eveningEnd} 
                              onChange={(e) => setSettings({ ...settings, eveningEnd: e.target.value })}
                              placeholder="21:00"
                              className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-purple-500 outline-none"
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveSettings(settings)}
                      className="w-full py-4 bg-gradient-to-r from-[#0B1B29] via-[#1B4F72] to-primary hover:brightness-110 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all outline-none cursor-pointer uppercase text-xs tracking-wider"
                    >
                      <Save className="w-4 h-4 text-emerald-300" />
                      {loading ? 'Saving Profile Changes...' : 'Save Profile Changes'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* BOOKING SCHEDULER RULES */}
            {tab === 'booking-rules' && (
              <div className="space-y-6">
                {/* Simple Booking Rules & Settings Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
                  <div>
                    <h2 className="font-playfair text-2xl font-black text-gray-900 flex items-center gap-2">
                      <Clock className="w-6 h-6 text-primary" /> Booking Rules & Clinic Timings
                    </h2>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      Configure clinic opening hours, consultation time per patient, daily limits, and working days.
                    </p>
                  </div>
                  {settings && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveSettings(settings)}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-accent hover:brightness-105 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md transition-all outline-none cursor-pointer shrink-0"
                    >
                      <Save className="w-4 h-4 text-emerald-300" />
                      Save Booking Rules
                    </button>
                  )}
                </div>

                {settings && (
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Clinic Timings & Limits Card */}
                      <div className="lg:col-span-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-3 border-b pb-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-playfair font-bold text-base text-gray-900">Clinic Timings & Patient Limits</h3>
                            <p className="text-[10px] text-gray-500 font-semibold">Set daily patient capacity and consultation time</p>
                          </div>
                        </div>
                        
                        {/* Consultation Time Per Patient */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-800 block">
                            Consultation Time Per Patient
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[15, 20, 30, 45].map((mins) => (
                              <button
                                type="button"
                                key={mins}
                                onClick={() => setSettings({ ...settings, onlineSlotDuration: mins })}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                  settings.onlineSlotDuration === mins
                                    ? 'bg-primary text-white border-primary shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {mins} Mins
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          {/* Max Patients Per Day */}
                          <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-800 mb-1.5">Max Patients Per Day</label>
                            <input 
                              type="number"
                              value={settings.onlineMaxDailyBooking}
                              onChange={(e) => setSettings({ ...settings, onlineMaxDailyBooking: Number(e.target.value) })}
                              className="px-4 py-2.5 border rounded-xl text-xs font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-primary outline-none transition-all"
                              placeholder="e.g. 15 Patients"
                            />
                          </div>
                          
                          {/* Advance Notice Needed */}
                          <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-800 mb-1.5">Advance Notice Required</label>
                            <select
                              value={settings.bookingBufferHours}
                              onChange={(e) => setSettings({ ...settings, bookingBufferHours: Number(e.target.value) })}
                              className="px-3 py-2.5 border rounded-xl text-xs font-bold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-primary outline-none transition-all cursor-pointer"
                            >
                              <option value={0}>Same Time Allowed</option>
                              <option value={2}>2 Hours Advance</option>
                              <option value={6}>6 Hours Advance</option>
                              <option value={12}>12 Hours Advance</option>
                              <option value={24}>24 Hours Advance</option>
                            </select>
                          </div>
                        </div>

                        {/* Clinic Opening & Closing Time */}
                        <div className="pt-2 border-t border-gray-150 space-y-3">
                          <label className="text-xs font-bold text-gray-800 block">Clinic Opening & Closing Hours</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Opening Time</span>
                              <input 
                                type="time" 
                                value={settings.onlineStart || '09:00'} 
                                onChange={(e) => setSettings({ ...settings, onlineStart: e.target.value })}
                                className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-primary outline-none"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Closing Time</span>
                              <input 
                                type="time" 
                                value={settings.onlineEnd || '18:00'} 
                                onChange={(e) => setSettings({ ...settings, onlineEnd: e.target.value })}
                                className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-gray-50/50 focus:bg-white focus:border-primary outline-none"
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Working Days Card */}
                      <div className="lg:col-span-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-3 border-b pb-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-playfair font-bold text-base text-gray-900">Clinic Working Days</h3>
                            <p className="text-[10px] text-gray-500 font-semibold">Toggle open & closed days for appointments</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-1">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                            const isOpen = settings.onlineDays?.includes(day);
                            return (
                              <label 
                                key={day} 
                                className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                                  isOpen 
                                    ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-bold shadow-2xs' 
                                    : 'bg-gray-50/50 border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                  <span className="text-xs font-bold">{day}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    isOpen ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {isOpen ? 'Clinic Open' : 'Closed'}
                                  </span>
                                  <input 
                                    type="checkbox"
                                    checked={isOpen}
                                    onChange={(e) => {
                                      const nextDays = e.target.checked 
                                        ? [...(settings.onlineDays || []), day]
                                        : (settings.onlineDays || []).filter(d => d !== day);
                                      setSettings({ ...settings, onlineDays: nextDays });
                                    }}
                                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                                  />
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Automated Messages Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
                      <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-playfair font-bold text-base text-gray-900">Automated Patient Message Templates</h3>
                            <p className="text-[10px] text-gray-500 font-semibold">Custom SMS & WhatsApp templates sent automatically to patients</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                          { key: 'booked', label: '📩 Booking Confirmation Message' },
                          { key: 'confirmed', label: '✅ Appointment Approved' },
                          { key: 'cancelled', label: '❌ Cancellation Notice' },
                          { key: 'rescheduled', label: '🔄 Rescheduled Date Notice' },
                          { key: 'reminderBefore', label: '⏰ 1-Hour Before Reminder' },
                          { key: 'prescriptionReady', label: '📄 Prescription PDF Ready' },
                        ].map(tmpl => (
                          <div key={tmpl.key} className="bg-gray-50/60 border border-gray-200 rounded-xl p-4 space-y-2 hover:border-primary/40 transition-colors">
                            <label className="text-xs font-bold text-gray-800 block">{tmpl.label}</label>
                            <textarea
                              rows={3}
                              value={(settings.emailTemplates as any)?.[tmpl.key] || ''}
                              onChange={(e) => setSettings({
                                ...settings,
                                emailTemplates: { ...(settings.emailTemplates || {} as any), [tmpl.key]: e.target.value }
                              })}
                              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium resize-none outline-none focus:border-primary focus:bg-white bg-white transition-all"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveSettings(settings)}
                      className="w-full py-4 bg-gradient-to-r from-primary to-accent hover:brightness-105 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md outline-none cursor-pointer text-xs uppercase tracking-wider transition-all"
                    >
                      <Save className="w-4 h-4 text-emerald-300" />
                      Save Booking Rules Settings
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* PREMIUM BLOG CMS */}
            {tab === 'blogs' && (
              <div className="bg-white border rounded-2xl p-6 shadow-xs space-y-6">
                
                {blogFormMode === 'list' ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h2 className="font-playfair text-xl font-bold text-gray-900">Education Skin Care Journals</h2>
                        <p className="text-xs text-gray-500 font-semibold mt-0.5">Write and edit educational blogs. Active logs: {blogTotal}.</p>
                      </div>
                      
                      <button
                        onClick={() => setBlogFormMode('create')}
                        className="px-4 py-2.5 bg-[#0B1B29] text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 hover:bg-primary transition-colors shrink-0 outline-none"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Write Blog Post
                      </button>
                    </div>

                    {/* Filter and search row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input 
                          type="text"
                          placeholder="Search articles..."
                          value={blogSearch}
                          onChange={(e) => { setBlogSearch(e.target.value); setBlogPage(1); }}
                          className="pl-9 pr-4 py-2.5 border rounded-xl w-full text-xs font-semibold outline-none"
                        />
                      </div>

                      <select
                        value={blogCategoryFilter}
                        onChange={(e) => { setBlogCategoryFilter(e.target.value); setBlogPage(1); }}
                        className="px-3 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-white"
                      >
                        <option value="All">All Categories</option>
                        <option value="Aesthetic Care">Aesthetic Care</option>
                        <option value="Hair Restoration">Hair Restoration</option>
                        <option value="Clinical Dermatology">Clinical Dermatology</option>
                        <option value="Laser Care">Laser Care</option>
                      </select>

                      <div className="flex gap-2 justify-end items-center">
                        <button
                          disabled={blogPage <= 1}
                          onClick={() => setBlogPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-2 border rounded-lg text-xs font-bold disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <span className="text-xs font-bold text-gray-500">Page {blogPage}</span>
                        <button
                          disabled={blogPage * 10 >= blogTotal}
                          onClick={() => setBlogPage(prev => prev + 1)}
                          className="px-3 py-2 border rounded-lg text-xs font-bold disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {/* Blogs listing */}
                    <div className="border rounded-2xl overflow-hidden divide-y">
                      {blogs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 font-semibold">No publications written yet.</div>
                      ) : (
                        blogs.map(post => (
                          <div key={post.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-lg bg-gray-100 border shrink-0 overflow-hidden relative">
                                <img src={post.imageUrl || 'https://picsum.photos/seed/skin/150/150'} alt="thumbnail" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 text-[8px] font-bold uppercase">
                                    {post.category}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    post.status === 'published' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-gray-100 border border-gray-200 text-gray-500'
                                  }`}>
                                    {post.status || 'draft'}
                                  </span>
                                  {post.featured && (
                                    <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-bold uppercase">
                                      ★ Featured
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-xs text-gray-900 mt-1 line-clamp-1">{post.title}</h4>
                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Views: {post.views || 0} • Written {new Date(post.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={() => initEditBlog(post)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                title="Edit post"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteBlog(post.id)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Delete post"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                ) : (
                  // Create/Edit Blog Form
                  <form onSubmit={handleBlogSubmit} className="space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <div>
                        <h2 className="font-playfair text-2xl font-black text-gray-900">
                          {blogFormMode === 'create' ? 'Draft Clinical Publication' : 'Edit Blog Journal'}
                        </h2>
                        <p className="text-xs text-gray-500 font-semibold mt-0.5">Author educational skin journals for your clinic audience.</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setBlogPreviewMode(!blogPreviewMode)}
                          className="px-4 py-2 bg-gray-100 border text-gray-800 text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 hover:bg-gray-200 outline-none transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                          {blogPreviewMode ? 'Back to Editor' : 'Live Preview'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlogFormMode('list')}
                          className="px-4 py-2 bg-white border text-gray-500 text-xs font-bold uppercase rounded-xl hover:bg-gray-50 outline-none transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    {!blogPreviewMode ? (
                      <div className="space-y-6">
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          
                          {/* Card 1: Article Metadata */}
                          <div className="lg:col-span-6 bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Journal Overview & Metadata</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Title, summary, category, and search tags</p>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Article Title *</label>
                              <input 
                                type="text"
                                required
                                value={blogForm.title}
                                onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                                className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-teal-500 outline-none transition-all"
                                placeholder="e.g. Modern Laser Acne Treatment Guidelines"
                              />
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Summary (1 Sentence Intro) *</label>
                              <input 
                                type="text"
                                required
                                value={blogForm.summary}
                                onChange={(e) => setBlogForm({ ...blogForm, summary: e.target.value })}
                                className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-teal-500 outline-none transition-all"
                                placeholder="e.g. Discover effective clinical skin rejuvenation procedures."
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                                <select
                                  value={blogForm.category}
                                  onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                                  className="px-3 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                                >
                                  <option value="Aesthetic Care">Aesthetic Care</option>
                                  <option value="Hair Restoration">Hair Restoration</option>
                                  <option value="Clinical Dermatology">Clinical Dermatology</option>
                                  <option value="Laser Care">Laser Care</option>
                                </select>
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Estimated Reading Time</label>
                                <input 
                                  type="text"
                                  value={blogForm.readTime}
                                  onChange={(e) => setBlogForm({ ...blogForm, readTime: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                                  placeholder="e.g. 4 min read"
                                />
                              </div>
                            </div>

                            {/* Tags Input */}
                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Topic Tags</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                  placeholder="Type tag & press enter"
                                  className="px-4 py-2 border rounded-xl text-xs font-semibold flex-1 outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                                />
                                <button type="button" onClick={addTag} className="px-4 bg-gray-100 hover:bg-gray-200 border text-xs font-bold rounded-xl transition-colors cursor-pointer">
                                  Add
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {(blogForm.tags || []).map(tag => (
                                  <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold uppercase shadow-2xs">
                                    {tag}
                                    <button type="button" onClick={() => removeTag(tag)} className="text-teal-600 font-black hover:text-rose-600">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>

                          </div>

                          {/* Card 2: SEO & Featured Image Settings */}
                          <div className="lg:col-span-6 space-y-6">
                            
                            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                              <div className="flex items-center gap-3 border-b pb-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                  <Search className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-playfair font-bold text-base text-gray-900">SEO & Featured Media</h3>
                                  <p className="text-[10px] text-gray-500 font-semibold">Search engine metadata and cover thumbnail</p>
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">SEO Meta Title</label>
                                <input 
                                  type="text"
                                  value={blogForm.seoTitle}
                                  onChange={(e) => setBlogForm({ ...blogForm, seoTitle: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                                  placeholder="Recommended: Under 60 characters"
                                />
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">SEO Meta Description</label>
                                <textarea
                                  rows={2}
                                  value={blogForm.seoDescription}
                                  onChange={(e) => setBlogForm({ ...blogForm, seoDescription: e.target.value })}
                                  className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                                  placeholder="Recommended: 150-160 characters"
                                />
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Featured Image URL</label>
                                <input 
                                  type="text"
                                  value={blogForm.imageUrl}
                                  onChange={(e) => setBlogForm({ ...blogForm, imageUrl: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                                />
                                <div className="mt-2.5 p-3 border border-dashed rounded-xl bg-gray-50/80 flex items-center justify-between">
                                  <span className="text-[10px] text-gray-500 font-bold uppercase">Upload New Cover File</span>
                                  <input 
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, (url) => setBlogForm({ ...blogForm, imageUrl: url }))}
                                    className="text-xs text-gray-500"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Card 3: Publishing Controls Card */}
                            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                              <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Publishing Controls</h4>
                              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={blogForm.featured}
                                    onChange={(e) => setBlogForm({ ...blogForm, featured: e.target.checked })}
                                    className="w-4 h-4 accent-amber-500 rounded"
                                  />
                                  <span className="text-xs font-bold text-gray-800">Pin as Featured Journal</span>
                                </label>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-700">Status:</span>
                                  <select
                                    value={blogForm.status}
                                    onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value as any })}
                                    className="px-3 py-1.5 border rounded-xl text-xs font-bold outline-none bg-white focus:border-primary"
                                  >
                                    <option value="draft">Draft (Private)</option>
                                    <option value="published">Publish (Live)</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                          </div>

                        </div>

                        {/* Card 4: Rich Markdown Editor Card */}
                        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-3 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between border-b pb-3">
                            <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
                              Article Body Content (Markdown Format) *
                            </label>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              Tip: Use ### for section headings and * for bullet points
                            </span>
                          </div>
                          <textarea 
                            rows={12}
                            required
                            value={blogForm.content}
                            onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                            placeholder="Write blog body here. Double line returns create paragraphs. Use ### for subheadings and * for lists."
                            className="w-full p-4 border rounded-xl text-xs font-mono resize-y outline-none focus:border-teal-500 bg-gray-50/30 focus:bg-white transition-all"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-4 bg-gradient-to-r from-[#0B1B29] via-[#1B4F72] to-teal-600 hover:brightness-110 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all outline-none cursor-pointer uppercase text-xs tracking-wider"
                        >
                          <Save className="w-4 h-4 text-emerald-300" />
                          {blogFormMode === 'create' ? 'Save & Publish Journal' : 'Apply Journal Updates'}
                        </button>

                      </div>
                    ) : (
                      // Live Preview panel
                      <div className="space-y-6 p-6 border rounded-2xl bg-[#FCFBF9] max-w-3xl mx-auto shadow-sm">
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                          {blogForm.category}
                        </span>
                        <h1 className="font-playfair text-2.5xl font-black text-gray-900 leading-tight">
                          {blogForm.title || 'Untitled Post'}
                        </h1>
                        <p className="text-xs text-gray-500 font-semibold">
                          {blogForm.readTime} • {blogForm.status === 'draft' ? 'Draft Mode' : 'Published'}
                        </p>
                        
                        {blogForm.imageUrl && (
                          <div className="h-64 relative rounded-2xl overflow-hidden border shadow-xs">
                            <img src={blogForm.imageUrl} alt="banner" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <blockquote className="border-l-4 border-accent p-4 bg-gray-50/80 rounded-r-xl italic text-sm font-semibold text-gray-700">
                          &ldquo;{blogForm.summary || 'Summary block text'}&rdquo;
                        </blockquote>

                        <div className="text-stone-850 text-sm leading-relaxed space-y-4">
                          {(blogForm.content || '').split('\n\n').map((para, pIdx) => {
                            if (para.startsWith('### ')) {
                              return <h3 key={pIdx} className="font-playfair text-lg font-bold text-gray-900 pt-2">{para.replace('### ', '')}</h3>;
                            }
                            if (para.startsWith('* ')) {
                              return (
                                <ul key={pIdx} className="list-disc pl-5 space-y-1">
                                  {para.split('\n').map((li, lIdx) => (
                                    <li key={lIdx}>{li.replace('* ', '')}</li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={pIdx} className="whitespace-pre-wrap">{para}</p>;
                          })}
                        </div>
                      </div>
                    )}

                  </form>
                )}

              </div>
            )}

            {/* DYNAMIC CMS HOMEPAGE EDITOR */}
            {tab === 'cms' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-200 pb-4">
                  <div>
                    <h2 className="font-playfair text-2xl font-black text-gray-900">Dynamic Homepage CMS Blocks</h2>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Instantly modify hero text, banner alerts, about details, and patient testimonials.</p>
                  </div>
                  {cms && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveCms(cms)}
                      className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:brightness-105 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-sm transition-all outline-none cursor-pointer shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      Save CMS Configuration
                    </button>
                  )}
                </div>

                {cms && (
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                    
                    {/* Card 1: Top Banner Section */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-playfair font-bold text-base text-gray-900">Top Banner Announcement Alert</h3>
                            <p className="text-[10px] text-gray-500 font-semibold">Displays ticker banner at top of website</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                          <span className="text-xs font-bold text-gray-700">Enable Banner</span>
                          <input 
                            type="checkbox"
                            checked={cms.bannerEnabled}
                            onChange={(e) => setCms({ ...cms, bannerEnabled: e.target.checked })}
                            className="w-4 h-4 accent-primary rounded"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Banner Announcement Text</label>
                          <input 
                            type="text"
                            value={cms.bannerText}
                            onChange={(e) => setCms({ ...cms, bannerText: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-primary"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Banner Redirect Link</label>
                          <input 
                            type="text"
                            value={cms.bannerLink}
                            onChange={(e) => setCms({ ...cms, bannerLink: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Homepage Hero Segment */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-playfair font-bold text-base text-gray-900">Homepage Hero Header Intro</h3>
                          <p className="text-[10px] text-gray-500 font-semibold">Primary hero text and clinic experience callouts</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Main Headline (Line 1)</label>
                          <input 
                            type="text"
                            value={cms.heroTitleLine1}
                            onChange={(e) => setCms({ ...cms, heroTitleLine1: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Main Headline (Line 2)</label>
                          <input 
                            type="text"
                            value={cms.heroTitleLine2}
                            onChange={(e) => setCms({ ...cms, heroTitleLine2: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Hero Subtitle</label>
                        <input 
                          type="text"
                          value={cms.heroSubtitle}
                          onChange={(e) => setCms({ ...cms, heroSubtitle: e.target.value })}
                          className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Hero Description Paragraph</label>
                        <textarea
                          rows={3}
                          value={cms.heroDescription}
                          onChange={(e) => setCms({ ...cms, heroDescription: e.target.value })}
                          className="p-3.5 border rounded-xl text-xs font-semibold resize-none outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Highlight Badge 1</label>
                          <input 
                            type="text"
                            value={cms.heroBadge1}
                            onChange={(e) => setCms({ ...cms, heroBadge1: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Highlight Badge 2</label>
                          <input 
                            type="text"
                            value={cms.heroBadge2}
                            onChange={(e) => setCms({ ...cms, heroBadge2: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Experience Badge</label>
                          <input 
                            type="text"
                            value={cms.heroExperienceBadge}
                            onChange={(e) => setCms({ ...cms, heroExperienceBadge: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card 3: About Segment */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-playfair font-bold text-base text-gray-900">About Clinic Section</h3>
                          <p className="text-[10px] text-gray-500 font-semibold">Doctor bio and clinical practice philosophy</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">About Section Title</label>
                          <input 
                            type="text"
                            value={cms.aboutTitle}
                            onChange={(e) => setCms({ ...cms, aboutTitle: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-purple-500"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">About Section Subtitle</label>
                          <input 
                            type="text"
                            value={cms.aboutSubtitle}
                            onChange={(e) => setCms({ ...cms, aboutSubtitle: e.target.value })}
                            className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">About Section Description</label>
                        <textarea
                          rows={4}
                          value={cms.aboutDescription}
                          onChange={(e) => setCms({ ...cms, aboutDescription: e.target.value })}
                          className="p-3.5 border rounded-xl text-xs font-semibold resize-none outline-none bg-gray-50/50 focus:bg-white focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Card 4: Patient Testimonials Segment */}
                    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-playfair font-bold text-base text-gray-900">Patient Testimonials & Reviews</h3>
                            <p className="text-[10px] text-gray-500 font-semibold">Featured clinical feedback on homepage</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt('Patient Name:');
                            const role = prompt('Treatment type:');
                            const text = prompt('Testimonial Text:');
                            if (name && text) {
                              setCms({
                                ...cms,
                                testimonials: [...cms.testimonials, { name, role: role || 'Patient', text, rating: 5 }]
                              });
                            }
                          }}
                          className="py-2 px-3.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Review Card
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cms.testimonials.map((test, idx) => (
                          <div key={idx} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 space-y-2 relative hover:bg-white transition-all shadow-2xs">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-gray-900">{test.name} • <span className="text-teal-700 font-semibold">{test.role}</span></span>
                              <button
                                type="button"
                                onClick={() => {
                                  const list = cms.testimonials.filter((_, i) => i !== idx);
                                  setCms({ ...cms, testimonials: list });
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Testimonial"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-600 font-semibold italic leading-relaxed">&ldquo;{test.text}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveCms(cms)}
                      className="w-full py-4 bg-gradient-to-r from-[#0B1B29] via-[#1B4F72] to-primary hover:brightness-110 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all outline-none cursor-pointer uppercase text-xs tracking-wider"
                    >
                      <Save className="w-4 h-4 text-emerald-300" />
                      Save Live CMS Configuration
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ONLINE CONSULTATIONS BOARD */}
            {tab === 'telemedicine' && (
              <div className="w-full space-y-4">
                <DoctorTelemedicineView initialStage={telemedicineStage} onStageChange={setTelemedicineStage} />
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </main>
      </div>

      {/* Mobile Drawer Notification Tray */}
      <AnimatePresence>
        {notifTrayOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifTrayOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            
            {/* Sliding Drawer Pane */}
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
                        <p className="text-[10px] text-gray-600 font-semibold leading-relaxed">{notif.message}</p>
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

      {/* Bottom Safe area Navigation for Mobile screens */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0B1B29] border-t border-[#1B2D3D] safe-area-pb z-35 shadow-2xl">
        <div className="flex max-w-lg mx-auto h-16">
          {[
            { id: 'overview' as const, label: 'Schedule', emoji: '📋' },
            { id: 'prepaid' as const, label: 'Payments', emoji: '💳' },
            { id: 'settings' as const, label: 'Profile', emoji: '⚙️' },
            { id: 'blogs' as const, label: 'Blogs', emoji: '✍️' },
            { id: 'telemedicine' as const, label: 'Online', emoji: '💻' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                tab === t.id ? 'text-white' : 'text-white/40'
              }`}
            >
              <span className={`text-base ${tab === t.id ? 'scale-110' : ''} transition-transform`}>
                {t.emoji}
              </span>
              <span className="text-[8px] font-bold tracking-widest uppercase">
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Floating Premium Toast Notifications (Apple Style) */}
      {msg && (
        <div className="fixed bottom-6 right-6 z-[99999] max-w-sm animate-fade-in-up">
          <div className="p-4 bg-white/80 backdrop-blur-xl border border-gray-150 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">System Notification</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">{msg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Premium Shadcn-style Confirmation Dialog */}
      {confirmModal?.show && (
        <div className="fixed inset-0 bg-[#0B1B29]/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl border border-gray-250 shadow-2xl p-6 space-y-6 text-left relative animate-fade-in-up">
            <div className="space-y-2">
              <h3 className="font-playfair text-lg font-black text-gray-900">{confirmModal.title}</h3>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-sans font-bold text-xs rounded-xl shadow-xs cursor-pointer text-center outline-none"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 border border-gray-250 text-gray-700 font-sans font-bold text-xs rounded-xl cursor-pointer text-center outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LogOut, PlusCircle, Trash2, BookOpen, Settings, Bell, Menu, X, Edit,
  Eye, FileText, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, PanelLeftClose, ShieldCheck, RefreshCw, Plus, Save, Loader2,
  Users, DollarSign, Calendar, Clock, Lock, Upload, Sparkles, HelpCircle,
  Briefcase, Image as ImageIcon, AlertCircle, Search, Video, PhoneCall, Award, CalendarDays, UserX, UserCheck, LifeBuoy, MessageSquare, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AppointmentsList from './AppointmentsList';
import QueueControls from './QueueControls';
import DoctorBookingHistory from './DoctorBookingHistory';
import DoctorTelemedicineView from '../doctor/DoctorTelemedicineView';
import type { Booking, ClinicSettings, BlogPost, CMSContent, DbNotification, DailyQueue, QueueEntry, SupportTicket } from '@/lib/types';
import { formatPrice, minutesToTime } from '@/lib/slots';

interface DoctorDashboardProps {
  onLogout: () => void;
}

type DoctorTab = 'overview' | 'history' | 'clinic-schedule' | 'online-schedule' | 'queue' | 'prepaid' | 'settings' | 'booking-rules' | 'blogs' | 'cms' | 'telemedicine' | 'support';

const getInitialTab = (): DoctorTab => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab') as DoctorTab;
    const validTabs: DoctorTab[] = ['overview', 'history', 'clinic-schedule', 'online-schedule', 'queue', 'prepaid', 'support', 'settings', 'booking-rules', 'blogs', 'cms', 'telemedicine'];
    if (urlTab && validTabs.includes(urlTab)) {
      return urlTab;
    }
    const savedTab = localStorage.getItem('doctor_active_tab') as DoctorTab;
    if (savedTab && validTabs.includes(savedTab)) {
      return savedTab;
    }
  }
  return 'overview';
};

const getInitialRulesSubTab = (): 'slots' | 'schedule' | 'fees' | 'block' => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlSubTab = params.get('subTab') as any;
    const validSubTabs = ['slots', 'schedule', 'fees', 'block'];
    if (urlSubTab && validSubTabs.includes(urlSubTab)) {
      return urlSubTab;
    }
    const savedSubTab = localStorage.getItem('doctor_rules_subtab') as any;
    if (savedSubTab && validSubTabs.includes(savedSubTab)) {
      return savedSubTab;
    }
  }
  return 'slots';
};

export default function DoctorDashboard({ onLogout }: DoctorDashboardProps) {
  const [tab, setTab] = useState<DoctorTab>(getInitialTab);
  const [telemedicineStage, setTelemedicineStage] = useState<'confirmed' | 'pending' | 'completed' | 'all'>('confirmed');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    offline: true,
    online: true,
    content: false,
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

  // Service/Treatment CRUD States
  const [serviceFormMode, setServiceFormMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeServiceIdx, setActiveServiceIdx] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
  });

  // Certificate CRUD States
  const [certFormMode, setCertFormMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeCertIdx, setActiveCertIdx] = useState<number | null>(null);
  const [certForm, setCertForm] = useState({
    title: '',
    institution: '',
    image: '',
  });

  // CMS Category Sub-Tab State
  const [cmsTab, setCmsTab] = useState<'hero' | 'about' | 'services' | 'before-after' | 'videos' | 'certificates' | 'faqs' | 'contact'>('hero');

  // Before & After CRUD States
  const [baFormMode, setBaFormMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeBaIdx, setActiveBaIdx] = useState<number | null>(null);
  const [baForm, setBaForm] = useState({
    treatment: '',
    duration: '',
    sessions: '',
    tag: '',
    beforeSrc: '',
    afterSrc: '',
  });

  // Video CRUD States
  const [videoFormMode, setVideoFormMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeVideoIdx, setActiveVideoIdx] = useState<number | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    desc: '',
    duration: '',
    videoUrl: '',
    thumbnail: '',
  });

  // Testimonial CRUD States
  const [testimonialFormMode, setTestimonialFormMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState<number | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    role: '',
    rating: 5,
    text: '',
  });

  // FAQ CRUD States
  const [faqFormMode, setFaqFormMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeFaqIdx, setActiveFaqIdx] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
  });

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

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [replyModalTicket, setReplyModalTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  // Category-wise Unread Notification Counts for Red Sidebar Badges
  const unreadNotifs = notifications.filter(n => !n.read);

  const unreadHistoryCount = unreadNotifs.filter(n => 
    n.type === 'booking_new' || n.type === 'reschedule_request'
  ).length;

  const unreadTelemedicineCount = unreadNotifs.filter(n =>
    (n.type === 'booking_new' || n.type === 'payment_received') &&
    (n.message?.toLowerCase().includes('video') || n.message?.toLowerCase().includes('online'))
  ).length;

  const unreadPrepaidCount = unreadNotifs.filter(n => n.type === 'payment_received').length;

  const unreadQueueCount = unreadNotifs.filter(n => n.type === 'patient_arrived' || n.type === 'queue_update').length;

  const unreadSupportCount = unreadNotifs.filter(n => n.type === 'support_ticket').length;

  const handleTabSelect = (selectedTab: DoctorTab) => {
    setTab(selectedTab);
    let typesToMark: string[] = [];
    if (selectedTab === 'history' || selectedTab === 'clinic-schedule' || selectedTab === 'online-schedule') {
      typesToMark = ['booking_new', 'reschedule_request'];
    }
    if (selectedTab === 'telemedicine') typesToMark = ['booking_new', 'payment_received'];
    if (selectedTab === 'prepaid') typesToMark = ['payment_received'];
    if (selectedTab === 'queue') typesToMark = ['patient_arrived', 'queue_update'];
    if (selectedTab === 'support') typesToMark = ['support_ticket'];

    if (typesToMark.length > 0) {
      setNotifications(prev => prev.map(n => typesToMark.includes(n.type) ? { ...n, read: true } : n));
      fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) }).catch(console.error);
    }
  };

  // Loading States
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [callingStaff, setCallingStaff] = useState(false);
  const [rulesSubTab, setRulesSubTab] = useState<'slots' | 'schedule' | 'fees' | 'block'>(getInitialRulesSubTab);

  // Sync active tab and subTab with URL & localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('doctor_active_tab', tab);
      localStorage.setItem('doctor_rules_subtab', rulesSubTab);
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

  const [blockDateInput, setBlockDateInput] = useState('');
  const [blockTimeInput, setBlockTimeInput] = useState('');
  const [inspectorDate, setInspectorDate] = useState(new Date().toISOString().split('T')[0]);
  const [hourFilter, setHourFilter] = useState<'all' | '11-12' | '12-1' | '1-2' | '2-3'>('all');
  const [dateBookings, setDateBookings] = useState<Booking[]>([]);
  const [fetchingDateBookings, setFetchingDateBookings] = useState(false);

  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  const preserveAllScroll = useCallback(async (action: () => Promise<void> | void) => {
    const windowPos = window.scrollY || document.documentElement.scrollTop;
    const containerPos = mainScrollRef.current?.scrollTop || 0;

    await action();

    const restore = () => {
      if (mainScrollRef.current && containerPos) {
        mainScrollRef.current.scrollTop = containerPos;
      }
      if (windowPos) {
        window.scrollTo({ top: windowPos, behavior: 'instant' as any });
      }
    };

    restore();
    requestAnimationFrame(restore);
    setTimeout(restore, 50);
    setTimeout(restore, 150);
  }, []);

  useEffect(() => {
    if (!inspectorDate) return;
    preserveAllScroll(async () => {
      setFetchingDateBookings(true);
      try {
        const [apptRes, settingsRes] = await Promise.all([
          fetch(`/api/appointments?date=${inspectorDate}`),
          fetch('/api/settings')
        ]);
        if (apptRes.ok) {
          const data = await apptRes.json();
          if (Array.isArray(data)) setDateBookings(data);
        }
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setSettings(sData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingDateBookings(false);
      }
    });
  }, [inspectorDate, preserveAllScroll]);
  const [showCustomBlockForm, setShowCustomBlockForm] = useState(false);
  const [slotViewFormat, setSlotViewFormat] = useState<'cmd' | 'cards'>('cmd');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSeenNotifIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  const playPing = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.currentTime = 0; // Reset playback to start
      audioRef.current.volume = 0.8; // Set volume to 80% for clarity
      audioRef.current.play()
        .then(() => {
          console.log('✅ playPing: Sound played successfully.');
        })
        .catch((err) => {
          console.warn('❌ playPing: HTML5 Audio play was blocked by browser autoplay policy. User must interact with the page first:', err);
        });
    } catch (err) {
      console.error('❌ playPing: Error initializing or playing audio:', err);
    }
  }, []);

  const triggerToast = useCallback((text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 12000); // 12 seconds to match staff dashboard
  }, []);

  const handleNewNotifications = useCallback((notifs: DbNotification[]) => {
    if (!notifs || notifs.length === 0) {
      lastSeenNotifIdRef.current = null;
      isFirstLoadRef.current = false;
      return;
    }

    const latestNotif = notifs[0]; // Sorted newest first (createdAt: -1)
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
        if (!n.read) {
          newNotifs.push(n);
        }
      }

      if (newNotifs.length > 0) {
        playPing();
        const newestUnread = newNotifs[0];
        triggerToast(`${newestUnread.title}: ${newestUnread.message}`);
      }

      lastSeenNotifIdRef.current = latestId;
    }
  }, [playPing, triggerToast]);

  // Load configs and data
  const refresh = useCallback(async () => {
    try {
      const [apptRes, allApptRes, settingsRes, cmsRes, blogRes, notifRes, queueRes, supportRes] = await Promise.all([
        fetch(`/api/appointments?date=${today}`),
        fetch('/api/appointments'),
        fetch('/api/settings'),
        fetch('/api/cms'),
        fetch(`/api/blogs?admin=true&search=${blogSearch}&category=${blogCategoryFilter}&page=${blogPage}&limit=10`),
        fetch('/api/notifications'),
        fetch(`/api/queue?date=${today}`),
        fetch('/api/support')
      ]);

      if (allApptRes.ok) {
        const all = await allApptRes.json();
        setAllBookings(all);
        setBookings(all.filter((b: Booking) => b.date === today));
      } else if (apptRes.ok) {
        const data = await apptRes.json();
        setBookings(data.filter((b: Booking) => b.date === today));
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
        const allNotifs: DbNotification[] = await notifRes.json();
        setNotifications(allNotifs || []);
        handleNewNotifications(allNotifs || []);
      }
      if (queueRes.ok) {
        const qData = await queueRes.json();
        setDaily(qData.daily);
        setEntries(qData.entries);
      }
      if (supportRes.ok) {
        setSupportTickets(await supportRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  }, [today, blogSearch, blogCategoryFilter, blogPage, handleNewNotifications]);

  // Helper helper to format appt fetch
  const appapptRes = async (res: Response) => {
    return await res.json();
  };

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.load();
      } else {
        audioRef.current.load();
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [apptRes, allApptRes, notifRes, queueRes, supportRes] = await Promise.all([
        fetch(`/api/appointments?date=${today}`),
        fetch('/api/appointments'),
        fetch('/api/notifications'),
        fetch(`/api/queue?date=${today}`),
        fetch('/api/support')
      ]);

      if (allApptRes.ok) {
        const all = await allApptRes.json();
        setAllBookings(all);
        setBookings(all.filter((b: Booking) => b.date === today));
      } else if (apptRes.ok) {
        const data = await apptRes.json();
        setBookings(data.filter((b: Booking) => b.date === today));
      }
      if (notifRes.ok) {
        const allNotifs: DbNotification[] = await notifRes.json();
        setNotifications(allNotifs || []);
        handleNewNotifications(allNotifs || []);
      }
      if (queueRes.ok) {
        const qData = await queueRes.json();
        setDaily(qData.daily);
        setEntries(qData.entries);
      }
      if (supportRes.ok) {
        setSupportTickets(await supportRes.json());
      }
    } catch { }
  }, [today, handleNewNotifications]);

  useEffect(() => {
    setIsInitialLoading(true);
    refresh().finally(() => setIsInitialLoading(false));
    // Poll appointments, queue status, and notifications every 8 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 8000);
    return () => clearInterval(interval);
  }, [refresh, refreshData]);

  // Cleaned up duplicate playPing and triggerToast definitions

  // Logouts
  const logout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' });
    onLogout();
  };

  const handleCallStaff = async () => {
    setCallingStaff(true);
    try {
      const nextPatient = waitingBookings[0];
      const title = nextPatient ? `Calling: ${nextPatient.name}` : 'Call Staff';
      const message = nextPatient
        ? `Slot: ${nextPatient.time}`
        : 'Please come to Doctor\'s cabin';

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          type: 'doctor-call',
          title,
          message
        }),
      });

      if (res.ok) {
        triggerToast(nextPatient ? `Called: ${nextPatient.name}` : 'Called Staff');
      } else {
        triggerToast('Failed to send call notification');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Error calling staff');
    } finally {
      setCallingStaff(false);
    }
  };

  // General POST setting updates
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const saveSettings = async (patch: Partial<ClinicSettings> & { blockSlot?: { date: string; time: string }; unblockSlot?: { date: string; time: string } }) => {
    await preserveAllScroll(async () => {
      setIsSavingSettings(true);
      setIsSavedSuccess(false);
      try {
        const sanitizedPatch = { ...patch };
        if ((sanitizedPatch as any).offlinePreBookingFee === '') (sanitizedPatch as any).offlinePreBookingFee = 0;
        if ((sanitizedPatch as any).offlineConsultationFee === '') (sanitizedPatch as any).offlineConsultationFee = 0;
        if ((sanitizedPatch as any).onlineConsultationFee === '') (sanitizedPatch as any).onlineConsultationFee = 0;
        if ((sanitizedPatch as any).onlinePreBookingFee === '') (sanitizedPatch as any).onlinePreBookingFee = 0;

        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitizedPatch),
        });
        if (res.ok) {
          setIsSavedSuccess(true);
          triggerToast('✅ SAVED! Clinic settings updated live');
          setTimeout(() => setIsSavedSuccess(false), 15000);
          await refreshData();
        } else {
          triggerToast('❌ Save settings failed');
        }
      } catch (err) {
        console.error(err);
        triggerToast('❌ Save error');
      } finally {
        setIsSavingSettings(false);
      }
    });
  };

  // General CMS updates
  const saveCms = async (patch: Partial<CMSContent>) => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        triggerToast('Homepage CMS updated live');
        refresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error || `Error ${res.status}: ${res.statusText}`;
        triggerToast(`Save failed: ${errMsg}`);
        console.error('saveCms failed:', errMsg);
      }
    } catch (err) {
      triggerToast(`Save failed: ${err instanceof Error ? err.message : 'Network error'}`);
      console.error('saveCms exception:', err);
    }
    setLoading(false);
  };

  // Treatments/Services CRUD Handlers
  const handleDeleteService = async (idx: number) => {
    if (!cms) return;
    if (confirm('Are you sure you want to delete this treatment?')) {
      const updatedServices = cms.services.filter((_, i) => i !== idx);
      const newCms = { ...cms, services: updatedServices };
      setCms(newCms);
      await saveCms(newCms);
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cms) return;
    if (!serviceForm.name || !serviceForm.description || !serviceForm.price) {
      alert('Please fill in Name, Description, and Price.');
      return;
    }

    const updatedServices = [...cms.services];
    const serviceData = {
      id: serviceForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      name: serviceForm.name,
      description: serviceForm.description,
      price: serviceForm.price,
    };

    if (serviceFormMode === 'edit' && activeServiceIdx !== null) {
      updatedServices[activeServiceIdx] = serviceData;
    } else {
      updatedServices.push(serviceData);
    }

    const newCms = { ...cms, services: updatedServices };
    setCms(newCms);
    setServiceFormMode('list');
    setActiveServiceIdx(null);
    await saveCms(newCms);
  };

  // Certificate CRUD Handlers
  const handleDeleteCertificate = async (idx: number) => {
    if (!cms) return;
    if (confirm('Are you sure you want to delete this certificate?')) {
      const updatedCerts = (cms.certificates || []).filter((_, i) => i !== idx);
      const newCms = { ...cms, certificates: updatedCerts };
      setCms(newCms);
      await saveCms(newCms);
    }
  };

  const handleSaveCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cms) return;
    if (!certForm.title || !certForm.institution || !certForm.image) {
      alert('Please fill in Title, Institution, and Upload an Image.');
      return;
    }

    const updatedCerts = [...(cms.certificates || [])];
    const certData = {
      id: `c-${Date.now()}`,
      title: certForm.title,
      institution: certForm.institution,
      image: certForm.image,
    };

    if (certFormMode === 'edit' && activeCertIdx !== null) {
      const originalId = updatedCerts[activeCertIdx]?.id || certData.id;
      updatedCerts[activeCertIdx] = { ...certData, id: originalId };
    } else {
      updatedCerts.push(certData);
    }

    const newCms = { ...cms, certificates: updatedCerts };
    setCms(newCms);
    setCertFormMode('list');
    setActiveCertIdx(null);
    await saveCms(newCms);
  };

  // Before & After CRUD Handlers
  const handleDeleteBeforeAfter = async (idx: number) => {
    if (!cms) return;
    if (confirm('Are you sure you want to delete this case?')) {
      const updated = (cms.beforeAfterCases || []).filter((_, i) => i !== idx);
      const newCms = { ...cms, beforeAfterCases: updated };
      setCms(newCms);
      await saveCms(newCms);
    }
  };

  const handleSaveBeforeAfter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cms) return;
    if (!baForm.treatment || !baForm.beforeSrc || !baForm.afterSrc) {
      alert('Please fill in Treatment, Before Photo, and After Photo.');
      return;
    }

    const updated = [...(cms.beforeAfterCases || [])];
    const caseData = {
      id: `ba-${Date.now()}`,
      treatment: baForm.treatment,
      duration: baForm.duration || '4 Weeks',
      sessions: baForm.sessions || '3 Sessions',
      tag: baForm.tag || 'Acne Care',
      beforeSrc: baForm.beforeSrc,
      afterSrc: baForm.afterSrc,
    };

    if (baFormMode === 'edit' && activeBaIdx !== null) {
      const originalId = updated[activeBaIdx]?.id || caseData.id;
      updated[activeBaIdx] = { ...caseData, id: originalId };
    } else {
      updated.push(caseData);
    }

    const newCms = { ...cms, beforeAfterCases: updated };
    setCms(newCms);
    setBaFormMode('list');
    setActiveBaIdx(null);
    await saveCms(newCms);
  };

  // Video CRUD Handlers
  const handleDeleteVideo = async (idx: number) => {
    if (!cms) return;
    if (confirm('Are you sure you want to delete this video?')) {
      const updated = (cms.videos || []).filter((_, i) => i !== idx);
      const newCms = { ...cms, videos: updated };
      setCms(newCms);
      await saveCms(newCms);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cms) return;
    if (!videoForm.title || !videoForm.videoUrl) {
      alert('Please fill in Video Title and Video URL.');
      return;
    }

    const updated = [...(cms.videos || [])];
    const videoData = {
      id: `v-${Date.now()}`,
      title: videoForm.title,
      desc: videoForm.desc,
      duration: videoForm.duration || '3:45',
      videoUrl: videoForm.videoUrl,
      thumbnail: videoForm.thumbnail || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80',
    };

    if (videoFormMode === 'edit' && activeVideoIdx !== null) {
      const originalId = updated[activeVideoIdx]?.id || videoData.id;
      updated[activeVideoIdx] = { ...videoData, id: originalId };
    } else {
      updated.push(videoData);
    }

    const newCms = { ...cms, videos: updated };
    setCms(newCms);
    setVideoFormMode('list');
    setActiveVideoIdx(null);
    await saveCms(newCms);
  };

  // Testimonial CRUD Handlers
  const handleDeleteTestimonial = async (idx: number) => {
    if (!cms) return;
    if (confirm('Are you sure you want to delete this review?')) {
      const updated = (cms.testimonials || []).filter((_, i) => i !== idx);
      const newCms = { ...cms, testimonials: updated };
      setCms(newCms);
      await saveCms(newCms);
    }
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cms) return;
    if (!testimonialForm.name || !testimonialForm.text) {
      alert('Please fill in Patient Name and Review Text.');
      return;
    }

    const updated = [...(cms.testimonials || [])];
    const testData = {
      name: testimonialForm.name,
      role: testimonialForm.role || 'Patient',
      rating: Number(testimonialForm.rating) || 5,
      text: testimonialForm.text,
    };

    if (testimonialFormMode === 'edit' && activeTestimonialIdx !== null) {
      updated[activeTestimonialIdx] = testData;
    } else {
      updated.push(testData);
    }

    const newCms = { ...cms, testimonials: updated };
    setCms(newCms);
    setTestimonialFormMode('list');
    setActiveTestimonialIdx(null);
    await saveCms(newCms);
  };

  // FAQ CRUD Handlers
  const handleDeleteFaq = async (idx: number) => {
    if (!cms) return;
    if (confirm('Are you sure you want to delete this FAQ?')) {
      const updated = (cms.faqs || []).filter((_, i) => i !== idx);
      const newCms = { ...cms, faqs: updated };
      setCms(newCms);
      await saveCms(newCms);
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cms) return;
    if (!faqForm.question || !faqForm.answer) {
      alert('Please fill in Question and Answer.');
      return;
    }

    const updated = [...(cms.faqs || [])];
    const faqData = {
      question: faqForm.question,
      answer: faqForm.answer,
    };

    if (faqFormMode === 'edit' && activeFaqIdx !== null) {
      updated[activeFaqIdx] = faqData;
    } else {
      updated.push(faqData);
    }

    const newCms = { ...cms, faqs: updated };
    setCms(newCms);
    setFaqFormMode('list');
    setActiveFaqIdx(null);
    await saveCms(newCms);
  };

  // Image Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    triggerToast('Uploading image...');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.imageUrl || (data.urls && data.urls[0]);
        if (url) {
          callback(url);
          triggerToast('Image uploaded successfully');
          return;
        }
      }
      
      // Fallback to FileReader base64
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          callback(reader.result);
          triggerToast('Image uploaded successfully');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload fetch failed, using base64 fallback:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          callback(reader.result);
          triggerToast('Image uploaded successfully');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Notification Operations
  const markNotifRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    });
    refreshData();
  };

  const markAllNotifRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    refreshData();
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
        refreshData();
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

  // Waiting bookings helper (to call staff for the next patient)
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
  };

  const sortBookings = (list: Booking[]) =>
    [...list].sort((a, b) => {
      const timeA = parseTimeToMinutes(a.time || '');
      const timeB = parseTimeToMinutes(b.time || '');
      if (timeA !== timeB) return timeA - timeB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  const activeQueueBookings = todayBookings.filter(b => b.status !== 'pending');
  const WAITING_STATUSES = ['confirmed', 'booked', 'checked-in', 'arrived'];
  const SERVING_STATUSES = ['arrived'];

  const waitingBookings = sortBookings(
    activeQueueBookings.filter(b => WAITING_STATUSES.includes(b.status as string) && !SERVING_STATUSES.includes(b.status as string))
  );

  const onlineBookingsCount = todayBookings.filter(b => b.source === 'online').length;
  const offlineBookingsCount = todayBookings.filter(b => b.source === 'walk-in').length;
  const waitingPatientsCount = todayBookings.filter(b => b.status === 'arrived' || b.status === 'confirmed').length; // Waiting in lobby
  const completedConsultations = todayBookings.filter(b => b.status === 'completed').length;

  const todayRevenue = todayBookings.reduce((sum, b) => {
    if (b.paymentStatus === 'paid') return sum + (b.amountPaid || 200);
    return sum;
  }, 0);

  const pendingPaymentsCount = todayBookings.filter(b => b.paymentStatus !== 'paid' && b.status !== 'completed').length;



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
    { id: 'history' as const, label: 'Date-wise Records', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'queue' as const, label: 'Queue Controls', icon: <Clock className="w-4 h-4" /> },
    { id: 'prepaid' as const, label: 'Pre-Paid', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'support' as const, label: 'Support Tickets', icon: <LifeBuoy className="w-4 h-4" /> },
    { id: 'settings' as const, label: 'Clinic Profile', icon: <Settings className="w-4 h-4" /> },
    { id: 'booking-rules' as const, label: 'Booking Rules', icon: <Clock className="w-4 h-4" /> },
    { id: 'blogs' as const, label: 'Blog Manager', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'cms' as const, label: 'CMS Homepage', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'telemedicine' as const, label: 'Online Consultations', icon: <Video className="w-4 h-4" /> },
  ];

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full bg-[#F4F6F8] font-sans flex items-center justify-center p-6 select-none">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto relative shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="font-playfair text-xl font-black text-gray-900 leading-tight">
              Loading Admin Console...
            </h2>
            <p className="text-xs text-gray-500 font-semibold">
              Fetching active patient appointments, OPD scheduler rules, and clinic configurations.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse w-3/4"></div>
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
              <div className="w-10 h-10 rounded-xl bg-white border border-white/20 p-1 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
                {settings?.clinicLogo ? (
                  <img src={settings.clinicLogo} alt={settings?.clinicName || 'Clinic Logo'} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-serif font-black text-xl text-[#0B1B29]">
                    {settings?.clinicName?.charAt(0) || 'S'}
                  </span>
                )}
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

          {/* 2. Mode Switcher Pill Control */}
          <div className="p-3 border-b border-[#1B2D3D] bg-[#07131E] shrink-0">
            <div className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1.5 px-1">
              ADMIN CONSOLE MODE
            </div>
            <div className="bg-[#112334] p-1 rounded-xl flex items-center gap-1 border border-white/5">
              <button
                onClick={() => handleTabSelect('overview')}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tab !== 'cms'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Console</span>
              </button>
              <button
                onClick={() => handleTabSelect('cms')}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'cms'
                  ? 'bg-emerald-500 text-white shadow-md font-black'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Global Settings</span>
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
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${tab === 'overview'
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

            {/* Category: OPD & RECEPTION */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-emerald-400 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  OPD & RECEPTION
                </span>
              </div>

              {/* Submenu 1: Offline / Clinic Patients */}
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => toggleGroup('offline')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Offline / Clinic Patients</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(unreadQueueCount + unreadPrepaidCount) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                        {unreadQueueCount + unreadPrepaidCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        expandedGroups.offline ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {expandedGroups.offline && (
                  <div className="pl-4 space-y-1 border-l-2 border-emerald-500/40 ml-3.5">
                    <button
                      onClick={() => handleTabSelect('queue')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'queue'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : unreadQueueCount > 0
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'queue' ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                        Live Queue
                      </span>
                      {unreadQueueCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                          {unreadQueueCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleTabSelect('clinic-schedule')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'clinic-schedule' || tab === 'history'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : unreadHistoryCount > 0
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'clinic-schedule' || tab === 'history' ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                        Today's Schedule & Records
                      </span>
                      {unreadHistoryCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                          {unreadHistoryCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleTabSelect('booking-rules')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'booking-rules'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'booking-rules' ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                        Slot Blocker & Rules
                      </span>
                    </button>

                    <button
                      onClick={() => handleTabSelect('prepaid')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'prepaid'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : unreadPrepaidCount > 0
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'prepaid' ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                        Pre-Paid Log
                      </span>
                      {unreadPrepaidCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                          {unreadPrepaidCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleTabSelect('settings')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'settings'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'settings' ? 'text-emerald-400' : 'text-gray-500'}>•</span>
                        Clinic Profile
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Submenu 2: Online Patients */}
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => toggleGroup('online')}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-4 h-4 text-sky-400" />
                    <span>Online Patients</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(unreadTelemedicineCount + unreadSupportCount) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                        {unreadTelemedicineCount + unreadSupportCount}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        expandedGroups.online ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {expandedGroups.online && (
                  <div className="pl-4 space-y-1 border-l-2 border-sky-500/40 ml-3.5">
                    <button
                      onClick={() => handleTabSelect('telemedicine')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'telemedicine'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : unreadTelemedicineCount > 0
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'telemedicine' ? 'text-sky-400' : 'text-gray-500'}>•</span>
                        Online Video Consultations
                      </span>
                      {unreadTelemedicineCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                          {unreadTelemedicineCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleTabSelect('online-schedule')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'online-schedule'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'online-schedule' ? 'text-sky-400' : 'text-gray-500'}>•</span>
                        Consultation Records
                      </span>
                    </button>

                    <button
                      onClick={() => handleTabSelect('support')}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        tab === 'support'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : unreadSupportCount > 0
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={tab === 'support' ? 'text-sky-400' : 'text-gray-500'}>•</span>
                        Support Tickets
                      </span>
                      {unreadSupportCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                          {unreadSupportCount}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category: CONTENT MANAGEMENT */}
            <div>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <div className="w-1 h-3.5 bg-sky-400 rounded-full" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                  EDITORIAL & HOMEPAGE
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
                        onClick={() => handleTabSelect(sub.id)}
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
          </div>

          {/* 4. Sidebar Footer */}
          <div className="p-4 border-t border-[#1B2D3D] bg-[#07131E] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Skin Hub Admin v2.0</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-[10px] font-bold text-gray-500 hover:text-gray-300 underline"
            >
              Hide
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
            onClick={handleCallStaff}
            disabled={callingStaff}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-emerald-400 disabled:opacity-50 flex items-center justify-center outline-none"
            title="Call Staff"
            aria-label="Call Staff"
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" />
          </button>
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
                    <div className="w-8 h-8 rounded-lg bg-white border border-white/20 p-0.5 flex items-center justify-center text-gray-900 font-bold text-base shadow-sm overflow-hidden shrink-0">
                      {settings?.clinicLogo ? (
                        <img src={settings.clinicLogo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span>{settings?.clinicName?.charAt(0) || 'S'}</span>
                      )}
                    </div>
                    <span className="font-playfair text-sm font-bold">{settings?.clinicName || 'Skin Hub'}</span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-2">
                  {navItems.map((item) => {
                    let count = 0;
                    if (item.id === 'history') count = unreadHistoryCount;
                    if (item.id === 'queue') count = unreadQueueCount;
                    if (item.id === 'prepaid') count = unreadPrepaidCount;
                    if (item.id === 'support') count = unreadSupportCount;
                    if (item.id === 'telemedicine') count = unreadTelemedicineCount;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleTabSelect(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-xl flex items-center justify-between font-sans text-xs font-bold uppercase tracking-wider transition-all outline-none ${tab === item.id
                          ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#E51C44] border border-rose-400 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse shrink-0">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom sidebar space */}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace Right Container with Independent Vertical Scroll */}
      <div ref={mainScrollRef} className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-[#F4F6F8]">
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
                  {(tab === 'history' || tab === 'clinic-schedule') && 'Offline Clinic OPD Patients List'}
                  {tab === 'online-schedule' && 'Online Video Consultation Patients List'}
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
                onClick={refresh}
                className="p-2.5 bg-white border rounded-xl shadow-xs hover:bg-gray-55 outline-none transition-all hover:rotate-180"
                title="Refresh console"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
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
                onClick={handleCallStaff}
                disabled={callingStaff}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Call Staff for Next Patient"
              >
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span>Call Staff</span>
              </button>
              <div className="h-8 w-[1px] bg-gray-200" />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
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
                        } else {
                          const data = await res.json().catch(() => ({}));
                          alert(data.error || 'Action failed.');
                        }

                      }}
                      onRefresh={refresh}
                      role="doctor"
                    />
                  </div>

                </div>
              )}

              {/* OFFLINE CLINIC PATIENTS SCHEDULE & RECORDS TAB (IMAGE 1 LIST FORMAT) */}
              {(tab === 'history' || tab === 'clinic-schedule') && (
                <div className="w-full space-y-6">
                  <AppointmentsList
                    bookings={allBookings}
                    loading={false}
                    onAction={async (id, action, nextScheduleDate, rescheduleDate, rescheduleTime, rescheduleReason, paymentMethod) => {
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
                          paymentMethod
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        triggerToast(`Action "${action}" completed`);
                        refresh();
                        return data;
                      } else {
                        const data = await res.json().catch(() => ({}));
                        alert(data.error || 'Action failed.');
                      }
                    }}
                    onRefresh={refresh}
                    role="doctor"
                    initialFilter="offline"
                  />
                </div>
              )}

              {/* ONLINE TELE-CONSULTATION PATIENTS RECORDS TAB (IMAGE 1 LIST FORMAT) */}
              {tab === 'online-schedule' && (
                <div className="w-full space-y-6">
                  <AppointmentsList
                    bookings={allBookings}
                    loading={false}
                    onAction={async (id, action, nextScheduleDate, rescheduleDate, rescheduleTime, rescheduleReason, paymentMethod) => {
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
                          paymentMethod
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        triggerToast(`Action "${action}" completed`);
                        refresh();
                        return data;
                      } else {
                        const data = await res.json().catch(() => ({}));
                        alert(data.error || 'Action failed.');
                      }
                    }}
                    onRefresh={refresh}
                    role="doctor"
                    initialFilter="online"
                  />
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
                    <h3 className="font-bold text-lg text-gray-900">Pre-Paid Clinic Logins</h3>
                    <p className="text-xs text-gray-500 mt-1 font-semibold">Skip billing queue directly. Generate Prescription directly.</p>
                  </div>

                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {allBookings.filter(b => b.paymentStatus === 'paid' && b.bookingType !== 'online').length === 0 ? (
                      <div className="p-12 text-center text-gray-500 font-semibold">No paid clinic records found.</div>
                    ) : (
                      allBookings.filter(b => b.paymentStatus === 'paid' && b.bookingType !== 'online').map(b => (
                        <div key={b.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase">
                              Paid ₹{b.amountPaid || 500}
                            </span>
                            <h4 className="font-bold text-gray-900 mt-1.5">{b.name}</h4>
                            <p className="text-xs text-gray-500 font-semibold">{b.phone} • {b.date} at {b.time} for {b.service}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.open(`/admin/prescription?patientId=${b.id}&type=clinic`, '_blank')}
                              className="px-4 py-2 bg-[#0B1B29] text-white text-xs font-bold uppercase tracking-wide rounded-lg flex items-center gap-1.5 hover:bg-primary transition-colors outline-none cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Write Rx
                            </button>
                            {Boolean(
                              (b as any).hasCaseFile === true ||
                              (b as any).prescriptionSent === true ||
                              (b as any).caseFileSent === true ||
                              ((b as any).prescriptionPdfBase64 && String((b as any).prescriptionPdfBase64).length > 50) ||
                              ((b as any).prescriptionData && (
                                (typeof (b as any).prescriptionData.medicines === 'string' && (b as any).prescriptionData.medicines.trim().length > 0) ||
                                (typeof (b as any).prescriptionData.advice === 'string' && (b as any).prescriptionData.advice.trim().length > 0)
                              ))
                            ) && (
                              <button
                                onClick={() => window.open(`/prescription/view?id=${b.id}`, '_blank')}
                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase tracking-wide rounded-lg flex items-center gap-1.5 transition-colors outline-none cursor-pointer"
                                title="View Patient's Completed Case File & Prescription Pad"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                View Case File
                              </button>
                            )}
                          </div>
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
                        onClick={async () => {
                          if (settings) await saveSettings(settings);
                          if (cms) await saveCms(cms);
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-primary to-accent hover:brightness-105 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-sm transition-all outline-none cursor-pointer shrink-0"
                      >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                      </button>
                    )}
                  </div>

                  {!settings ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3 shadow-2xs animate-pulse">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      <p className="text-xs font-bold text-gray-700">Loading clinic profile details...</p>
                      <p className="text-[10px] text-gray-400 font-medium">Fetching settings from clinic server...</p>
                    </div>
                  ) : (
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

                      {/* Top Banner Announcement Alert (Moved from CMS) */}
                      {cms && (
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
                      )}





                      <button
                        type="button"
                        disabled={loading}
                        onClick={async () => {
                          if (settings) await saveSettings(settings);
                          if (cms) await saveCms(cms);
                        }}
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
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
                    <div>
                      <h2 className="font-playfair text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-primary" /> Booking Rules & Operations
                      </h2>
                      <p className="text-xs text-gray-500 font-semibold mt-1">
                        Easily manage consultation durations, OPD timings, hourly buffer slots, pricing, and blocked dates.
                      </p>
                    </div>
                    {settings && (
                      <button
                        type="button"
                        disabled={loading || isSavingSettings}
                        onClick={() => saveSettings(settings)}
                        className={`px-6 py-3 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md transition-all outline-none cursor-pointer shrink-0 ${
                          isSavedSuccess
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-300 shadow-lg scale-105'
                            : isSavingSettings
                            ? 'bg-amber-600 text-white'
                            : 'bg-gradient-to-r from-primary to-accent hover:brightness-105 text-white'
                        }`}
                      >
                        {isSavingSettings ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Saving Settings...</span>
                          </>
                        ) : isSavedSuccess ? (
                          <>
                            <CheckCircle className="w-4.5 h-4.5 text-white animate-bounce" />
                            <span>✓ SETTINGS SAVED!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 text-emerald-300" />
                            <span>Save All Settings</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Sub-Navigation Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setRulesSubTab('slots')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        rulesSubTab === 'slots'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>⏰ Slot Duration & Hourly Buffer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRulesSubTab('schedule')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        rulesSubTab === 'schedule'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>📅 OPD Hours & Days</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRulesSubTab('fees')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        rulesSubTab === 'fees'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>💰 Fees & Payment Rules</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRulesSubTab('block')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                        rulesSubTab === 'block'
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>🚫 Date & Time Slot Blocker</span>
                    </button>
                  </div>

                  {!settings ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3 shadow-2xs animate-pulse">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      <p className="text-xs font-bold text-gray-700">Loading consultation rules & slot configurations...</p>
                      <p className="text-[10px] text-gray-400 font-medium">Fetching settings from clinic server...</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

                      {/* SUB-TAB 1: Slot Duration & Hourly Buffer */}
                      {rulesSubTab === 'slots' && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <Clock className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Consultation Time & Buffer Rules</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Set patient consultation duration and automatic hourly buffer slots</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={loading || isSavingSettings}
                              onClick={() => saveSettings(settings)}
                              className={`px-5 py-2.5 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                                isSavedSuccess
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-300 scale-105'
                                  : isSavingSettings
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-primary hover:bg-primary/90 text-white'
                              }`}
                            >
                              {isSavingSettings ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  <span>Saving...</span>
                                </>
                              ) : isSavedSuccess ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-white animate-bounce" />
                                  <span>✓ SETTINGS SAVED!</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 text-emerald-300" />
                                  <span>Save Settings</span>
                                </>
                              )}
                            </button>
                          </div>

                          {isSavedSuccess && (
                            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold animate-fade-in shadow-2xs">
                              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                              <span>✓ Settings have been successfully saved and applied live to the booking system!</span>
                            </div>
                          )}

                          {/* Custom Consultation Time */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-gray-800">
                                Consultation Time Per Patient (Minutes)
                              </label>
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                                ⚡ {settings.slotDurationMinutes || 3} Mins ({Math.floor(60 / (settings.slotDurationMinutes || 3))} slots/hour)
                              </span>
                            </div>

                            {/* Preset Pills */}
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

                            {/* Custom Input */}
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-xs font-bold text-gray-600">Custom Duration:</span>
                              <input
                                type="number"
                                min={1}
                                max={120}
                                value={settings.slotDurationMinutes || 3}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value));
                                  const updated = { ...settings, slotDurationMinutes: val, onlineSlotDuration: val };
                                  setSettings(updated);
                                  saveSettings({ slotDurationMinutes: val, onlineSlotDuration: val });
                                }}
                                className="w-28 px-3 py-1.5 border rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-primary outline-none"
                                placeholder="Custom Mins"
                              />
                              <span className="text-xs font-medium text-gray-500">Minutes</span>
                            </div>
                          </div>

                          {/* Live Slot Inspector - Clean Light Table List (Exact Image 2 Style) */}
                          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                            {/* Top Title & Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                              <div>
                                <h3 className="font-playfair font-black text-xl text-gray-900 flex items-center gap-2">
                                  📋 OPD Slot Schedule & Rules
                                </h3>
                                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                                  Triage consultation slots, update reserved buffer status, and inspect daily 4-min slot list.
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                  Select Date:
                                  {fetchingDateBookings && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                                </span>
                                <input
                                  type="date"
                                  value={inspectorDate}
                                  onChange={(e) => setInspectorDate(e.target.value)}
                                  className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none focus:border-primary cursor-pointer shadow-2xs"
                                />
                                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                  <button
                                    type="button"
                                    onClick={() => setSlotViewFormat('cmd')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      slotViewFormat === 'cmd'
                                        ? 'bg-white text-gray-900 shadow-2xs border border-gray-200'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    📋 Table List
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSlotViewFormat('cards')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      slotViewFormat === 'cards'
                                        ? 'bg-white text-gray-900 shadow-2xs border border-gray-200'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                  >
                                    📊 Cards
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Filter Pills Bar (Exact Image 2 Yellow/White Pill style) */}
                            <div className="flex flex-wrap items-center gap-2">
                              {[
                                { id: 'all', label: '⚡ ALL SLOTS (11 AM - 3 PM)' },
                                { id: '11-12', label: '11:00 AM - 12:00 PM' },
                                { id: '12-1', label: '12:00 PM - 01:00 PM' },
                                { id: '1-2', label: '01:00 PM - 02:00 PM' },
                                { id: '2-3', label: '02:00 PM - 03:00 PM' },
                              ].map((f) => (
                                <button
                                  type="button"
                                  key={f.id}
                                  onClick={() => setHourFilter(f.id as any)}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                                    hourFilter === f.id
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>

                            {/* Table List View (Exact Image 2 Table Format) */}
                            {slotViewFormat === 'cmd' ? (
                              <div className="overflow-hidden border border-gray-200 rounded-2xl shadow-2xs">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3 px-4 w-12 text-center">S.NO</th>
                                        <th className="py-3 px-4"># SLOT TIME</th>
                                        <th className="py-3 px-4">OPD SESSION</th>
                                        <th className="py-3 px-4">SLOT TYPE</th>
                                        <th className="py-3 px-4">PAYMENT / TYPE</th>
                                        <th className="py-3 px-4 text-center">STATUS</th>
                                        <th className="py-3 px-4 text-right">ACTIONS</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 bg-white">
                                      {(() => {
                                        const duration = settings.slotDurationMinutes || 3;
                                        const bufferCount = settings.hourlyBufferCount ?? 3;
                                        const isBufferEnabled = settings.autoReserveHourlyBufferSlots ?? true;

                                        const hourBlocks = [
                                          { id: '11-12', label: '11:00 AM - 12:00 PM', startMin: 660 },
                                          { id: '12-1', label: '12:00 PM - 01:00 PM', startMin: 720 },
                                          { id: '1-2', label: '01:00 PM - 02:00 PM', startMin: 780 },
                                          { id: '2-3', label: '02:00 PM - 03:00 PM', startMin: 840 },
                                        ].filter(h => hourFilter === 'all' || hourFilter === h.id);

                                        const rows: {
                                          time: string;
                                          endTime: string;
                                          timeRange: string;
                                          session: string;
                                          type: 'patient' | 'buffer' | 'custom' | 'open';
                                          isBlocked: boolean;
                                          patientBooking?: any;
                                        }[] = [];

                                        for (const hBlock of hourBlocks) {
                                          const totalSlots = Math.max(1, Math.floor(60 / duration));
                                          for (let sIdx = 0; sIdx < totalSlots; sIdx++) {
                                            const slotMin = hBlock.startMin + sIdx * duration;
                                            const timeStr = minutesToTime(slotMin);
                                            const endTimeStr = minutesToTime(slotMin + duration);
                                            const rangeStr = `${timeStr} - ${endTimeStr}`;

                                            const patientBooking = dateBookings.find(
                                              (b: any) => b.date === inspectorDate && b.time === timeStr && b.status !== 'cancelled'
                                            );

                                            let isBuffer = false;
                                            if (isBufferEnabled) {
                                              if (bufferCount >= 4) {
                                                isBuffer = (sIdx + 1) % Math.max(1, Math.floor(totalSlots / 4)) === 0;
                                              } else if (bufferCount === 2) {
                                                isBuffer = sIdx === Math.floor(totalSlots / 2) || sIdx === (totalSlots - 1);
                                              } else if (bufferCount === 1) {
                                                isBuffer = sIdx === (totalSlots - 1);
                                              } else {
                                                const step = Math.max(1, Math.floor(totalSlots / 4));
                                                isBuffer = (sIdx === step - 1 || sIdx === step * 2 - 1 || sIdx === step * 3 - 1);
                                              }
                                            }

                                            const isCustom = (settings.blockedSlots || []).some(
                                              (b) => b.date === inspectorDate && b.time === timeStr
                                            );

                                            const isExplicitUnblocked = (settings.blockedSlots || []).some(
                                              (b) => b.date === inspectorDate && b.time === `UNBLOCK_${timeStr}`
                                            );

                                            const isCurrentlyBlocked = !!patientBooking || isCustom || (isBuffer && !isExplicitUnblocked);

                                            rows.push({
                                              time: timeStr,
                                              endTime: endTimeStr,
                                              timeRange: rangeStr,
                                              session: hBlock.label,
                                              type: patientBooking ? 'patient' : isCustom ? 'custom' : isBuffer ? 'buffer' : 'open',
                                              isBlocked: isCurrentlyBlocked,
                                              patientBooking,
                                            });
                                          }
                                        }

                                        return rows.map((row, idx) => (
                                          <tr key={idx} className="hover:bg-gray-50/80 transition-colors text-xs font-semibold text-gray-900">
                                            <td className="py-3 px-4 text-center font-bold text-gray-500 text-[11px] whitespace-nowrap">
                                              {idx + 1}
                                            </td>
                                            <td className="py-3 px-4 font-extrabold text-primary flex items-center gap-1.5 whitespace-nowrap">
                                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                                              {row.timeRange}
                                            </td>

                                            <td className="py-3 px-4 text-gray-600 text-[11px] font-bold whitespace-nowrap">
                                              {row.session}
                                            </td>

                                            <td className="py-3 px-4 whitespace-nowrap">
                                              {row.type === 'patient' ? (
                                                <span className="text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                                  👤 BOOKED BY PATIENT
                                                </span>
                                              ) : row.type === 'custom' ? (
                                                <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                                  🚫 CUSTOM BLOCKED
                                                </span>
                                              ) : row.type === 'buffer' ? (
                                                <span className="text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1">
                                                  🛡️ OFFLINE PATIENT RESERVED ({duration}M)
                                                </span>
                                              ) : (
                                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                                                  🟢 PATIENT OPD SLOT
                                                </span>
                                              )}
                                            </td>

                                            <td className="py-3 px-4 whitespace-nowrap">
                                              {row.patientBooking ? (
                                                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                  {row.patientBooking.bookingType === 'online' ? '🌐 ONLINE CONSULT' : '🏥 CLINIC VISIT'}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                  🏥 OFFLINE PATIENT
                                                </span>
                                              )}
                                            </td>

                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                                                row.patientBooking
                                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                                  : row.isBlocked
                                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              }`}>
                                                {row.patientBooking
                                                  ? `BOOKED (${row.patientBooking.name})`
                                                  : row.isBlocked
                                                  ? 'RESERVED (OFFLINE PATIENT)'
                                                  : 'AVAILABLE'}
                                              </span>
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                              {row.patientBooking ? (
                                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                                                  BOOKED
                                                </span>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const current = settings.blockedSlots || [];
                                                    let updated = current;
                                                    if (row.type === 'custom') {
                                                      updated = current.filter(b => !(b.date === inspectorDate && b.time === row.time));
                                                      triggerToast(`🟢 Unblocked custom ${row.time}`);
                                                    } else if (row.type === 'buffer') {
                                                      if (row.isBlocked) {
                                                        updated = [...current, { date: inspectorDate, time: `UNBLOCK_${row.time}` }];
                                                        triggerToast(`🟢 Toggled OFF (Available) for ${row.time}`);
                                                      } else {
                                                        updated = current.filter(b => !(b.date === inspectorDate && b.time === `UNBLOCK_${row.time}`));
                                                        triggerToast(`🛡️ Toggled ON (Reserved) for ${row.time}`);
                                                      }
                                                    } else {
                                                      if (row.isBlocked) {
                                                        updated = current.filter(b => !(b.date === inspectorDate && b.time === row.time));
                                                        triggerToast(`🟢 Unblocked ${row.time}`);
                                                      } else {
                                                        updated = [...current, { date: inspectorDate, time: row.time }];
                                                        triggerToast(`🚫 Blocked ${row.time}`);
                                                      }
                                                    }
                                                    setSettings({ ...settings, blockedSlots: updated });
                                                    saveSettings({ blockedSlots: updated });
                                                  }}
                                                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
                                                    row.isBlocked
                                                      ? 'bg-primary hover:bg-primary/90 text-white'
                                                      : 'bg-red-600 hover:bg-red-700 text-white'
                                                  }`}
                                                >
                                                  {row.isBlocked ? 'TOGGLE OFF' : 'BLOCK SLOT'}
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ));
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              /* Cards View */
                              <div className="space-y-3 font-sans">
                                {[
                                  { id: '11-12', label: '11:00 AM - 12:00 PM', startMins: 660 },
                                  { id: '12-1', label: '12:00 PM - 01:00 PM', startMins: 720 },
                                  { id: '1-2', label: '01:00 PM - 02:00 PM', startMins: 780 },
                                  { id: '2-3', label: '02:00 PM - 03:00 PM', startMins: 840 },
                                ].filter(h => hourFilter === 'all' || hourFilter === h.id).map((hBlock) => {
                                  const duration = settings.slotDurationMinutes || 3;
                                  const slotsInHour: string[] = [];
                                  for (let m = hBlock.startMins; m < hBlock.startMins + 60; m += duration) {
                                    slotsInHour.push(minutesToTime(m));
                                  }
                                  const bufferCount = settings.hourlyBufferCount ?? 3;
                                  const isBufferEnabled = settings.autoReserveHourlyBufferSlots ?? true;

                                  return (
                                    <div key={hBlock.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-gray-900">
                                          ⏰ {hBlock.label}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-1.5">
                                        {slotsInHour.map((timeStr, sIdx) => {
                                          const totalSlotsInHr = Math.max(1, Math.floor(60 / duration));

                                          const patientBooking = dateBookings.find(
                                            (b: any) => b.date === inspectorDate && b.time === timeStr && b.status !== 'cancelled'
                                          );

                                          let isBuffer = false;
                                          if (isBufferEnabled) {
                                            if (bufferCount >= 4) {
                                              isBuffer = (sIdx + 1) % Math.max(1, Math.floor(totalSlotsInHr / 4)) === 0;
                                            } else if (bufferCount === 2) {
                                              isBuffer = sIdx === Math.floor(totalSlotsInHr / 2) || sIdx === (totalSlotsInHr - 1);
                                            } else if (bufferCount === 1) {
                                              isBuffer = sIdx === (totalSlotsInHr - 1);
                                            } else {
                                              const step = Math.max(1, Math.floor(totalSlotsInHr / 4));
                                              isBuffer = (sIdx === step - 1 || sIdx === step * 2 - 1 || sIdx === step * 3 - 1);
                                            }
                                          }
                                          const isCustomBlocked = (settings.blockedSlots || []).some(
                                            (b) => b.date === inspectorDate && b.time === timeStr
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
                                                } else {
                                                  updated = [...current, { date: inspectorDate, time: timeStr }];
                                                }
                                                setSettings({ ...settings, blockedSlots: updated });
                                                saveSettings({ blockedSlots: updated });
                                              }}
                                              className={`p-1.5 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer ${
                                                patientBooking
                                                  ? 'bg-blue-600 text-white border-blue-600'
                                                  : isCustomBlocked
                                                  ? 'bg-red-600 text-white border-red-600'
                                                  : isBuffer
                                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                              }`}
                                              title={patientBooking ? `Booked by ${patientBooking.name}` : timeStr}
                                            >
                                              {patientBooking ? `👤 ${timeStr}` : timeStr}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 2: OPD Schedule & Working Days */}
                      {rulesSubTab === 'schedule' && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                          <div className="flex items-center gap-3 border-b pb-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                              <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-playfair font-bold text-base text-gray-900">OPD Timings & Working Days</h3>
                              <p className="text-[10px] text-gray-500 font-semibold">Configure working days, session hours, and booking notice windows</p>
                            </div>
                          </div>

                          {/* Session Timings */}
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-800 block">OPD Session Timings (24-Hour Format)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                                <span className="text-xs font-bold text-gray-700 block">Morning Hours</span>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={settings.morningStart}
                                    onChange={(e) => setSettings({ ...settings, morningStart: e.target.value })}
                                    placeholder="09:00"
                                    className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                                  />
                                  <span className="text-gray-400 font-bold text-xs">-</span>
                                  <input
                                    type="text"
                                    value={settings.morningEnd}
                                    onChange={(e) => setSettings({ ...settings, morningEnd: e.target.value })}
                                    placeholder="14:00"
                                    className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                                  />
                                </div>
                              </div>

                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                                <span className="text-xs font-bold text-gray-700 block">Evening Hours</span>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={settings.eveningStart}
                                    onChange={(e) => setSettings({ ...settings, eveningStart: e.target.value })}
                                    placeholder="17:00"
                                    className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                                  />
                                  <span className="text-gray-400 font-bold text-xs">-</span>
                                  <input
                                    type="text"
                                    value={settings.eveningEnd}
                                    onChange={(e) => setSettings({ ...settings, eveningEnd: e.target.value })}
                                    placeholder="21:00"
                                    className="w-full text-center border rounded-xl py-2 text-xs font-bold bg-white focus:border-primary outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Days Selector */}
                          <div className="pt-3 border-t border-gray-150 space-y-2">
                            <label className="text-xs font-bold text-gray-800 block">Clinic Open Days</label>
                            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                const isOpen = settings.availableDays?.includes(day);
                                return (
                                  <button
                                    type="button"
                                    key={day}
                                    onClick={() => {
                                      const current = settings.availableDays || [];
                                      const next = isOpen ? current.filter((d) => d !== day) : [...current, day];
                                      setSettings({ ...settings, availableDays: next });
                                    }}
                                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                      isOpen
                                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                        : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                    }`}
                                  >
                                    {day.slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Advance Booking Window */}
                          <div className="pt-3 border-t border-gray-150 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-gray-800">Advance Booking Open Window (Days)</label>
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                {settings.advanceBookingDays || 7} Days Open
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {[1, 3, 7, 14, 30].map((days) => (
                                <button
                                  type="button"
                                  key={days}
                                  onClick={() => setSettings({ ...settings, advanceBookingDays: days })}
                                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                    (settings.advanceBookingDays || 7) === days
                                      ? 'bg-primary text-white border-primary shadow-xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {days} {days === 1 ? 'Day' : 'Days'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 3: Consultation Fees & Payment Rules */}
                      {rulesSubTab === 'fees' && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                          <div className="flex items-center gap-3 border-b pb-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                              <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-playfair font-bold text-base text-gray-900">Consultation Pricing & Payment Rules</h3>
                              <p className="text-[10px] text-gray-500 font-semibold">Configure OPD fees, advance pre-booking charges, and payment timing</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Clinic OPD Visit Rules */}
                            <div className="p-5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-emerald-950 tracking-wider">
                                  🏥 Clinic OPD Visit Rules
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {(settings.offlinePaymentTiming || (settings.offlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking' ? '⚡ Advance Prepayment' : '🏥 Pay at Clinic Desk'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 font-sans">
                                <button
                                  type="button"
                                  onClick={() => setSettings({ ...settings, offlinePaymentTiming: 'pre_booking', offlinePaymentMandatory: true })}
                                  className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                    (settings.offlinePaymentTiming || (settings.offlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking'
                                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  ⚡ Pre-Booking Advance
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSettings({ ...settings, offlinePaymentTiming: 'after_booking', offlinePaymentMandatory: false })}
                                  className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                    (settings.offlinePaymentTiming || (settings.offlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'after_booking'
                                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  🏥 Pay at Desk (Later)
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                {(settings.offlinePaymentTiming || (settings.offlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking' && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 block">Pre-Booking Fee (Online QR)</span>
                                    <div className="relative">
                                      <span className="absolute left-3 top-2 text-xs font-black text-gray-400">₹</span>
                                      <input
                                        type="number"
                                        value={settings.offlinePreBookingFee === undefined || settings.offlinePreBookingFee === null ? '' : settings.offlinePreBookingFee}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setSettings({ ...settings, offlinePreBookingFee: val === '' ? ('' as any) : Number(val) });
                                        }}
                                        placeholder="50"
                                        className="w-full pl-7 pr-2 py-1.5 border rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-500 outline-none"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className={`space-y-1 ${(settings.offlinePaymentTiming || (settings.offlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'after_booking' ? 'col-span-2' : ''}`}>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 block">Total OPD Fee</span>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2 text-xs font-black text-gray-400">₹</span>
                                    <input
                                      type="number"
                                      value={settings.offlineConsultationFee === undefined || settings.offlineConsultationFee === null ? '' : settings.offlineConsultationFee}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const num = val === '' ? ('' as any) : Number(val);
                                        setSettings({ ...settings, offlineConsultationFee: num, consultationFee: num });
                                      }}
                                      placeholder="200"
                                      className="w-full pl-7 pr-2 py-1.5 border rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-500 outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Online Video Consult Rules */}
                            <div className="p-5 bg-teal-50/50 border border-teal-200/80 rounded-2xl space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-teal-950 tracking-wider">
                                  🌐 Online Video Consult Rules
                                </span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                                  {(settings.onlinePaymentTiming || (settings.onlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking' ? '⚡ Prepayment' : '⏳ Pay After'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 font-sans">
                                <button
                                  type="button"
                                  onClick={() => setSettings({ ...settings, onlinePaymentTiming: 'pre_booking', onlinePaymentMandatory: true })}
                                  className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                    (settings.onlinePaymentTiming || (settings.onlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking'
                                      ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  ⚡ Advance Prepayment
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSettings({ ...settings, onlinePaymentTiming: 'after_booking', onlinePaymentMandatory: false })}
                                  className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                    (settings.onlinePaymentTiming || (settings.onlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'after_booking'
                                      ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  ⏳ Pay After Consult
                                </button>
                              </div>

                              <div className="pt-1">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 block">Total Video Consultation Fee</span>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2 text-xs font-black text-gray-400">₹</span>
                                    <input
                                      type="number"
                                      value={settings.onlineConsultationFee === undefined || settings.onlineConsultationFee === null ? '' : settings.onlineConsultationFee}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const num = val === '' ? ('' as any) : Number(val);
                                        setSettings({ ...settings, onlineConsultationFee: num, onlinePreBookingFee: num });
                                      }}
                                      placeholder="500"
                                      className="w-full pl-7 pr-2 py-1.5 border rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-teal-500 outline-none"
                                    />
                                  </div>
                                  <p className="text-[10px] text-gray-500 font-semibold mt-1">
                                    • Online Video Consult me ek hi full payment rahta hai jo booking ke samay ek saath pay karna hota hai.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 4: Calendar Date & Time Slot Blocker */}
                      {rulesSubTab === 'block' && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Date & Time Slot Blocker</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Manage per-hour buffer slots and custom holiday/slot blocks in list view</p>
                              </div>
                            </div>

                            {/* Top Controls: Date Selector & Custom Block Toggle Button */}
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
                                onChange={(e) => preserveAllScroll(() => setInspectorDate(e.target.value))}
                                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none focus:border-primary cursor-pointer shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCustomBlockForm(!showCustomBlockForm)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                  showCustomBlockForm
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                <span>➕ Custom Block</span>
                              </button>
                            </div>
                          </div>

                          {/* Custom Block Input Form (Collapsible / Toggleable) */}
                          {showCustomBlockForm && (
                            <div className="p-4 bg-red-50/50 border border-red-200 rounded-2xl space-y-3">
                              <h4 className="text-xs font-bold text-red-950 uppercase tracking-wider">➕ Add Custom Blocked Date / Slot</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-gray-700 block">Date *</label>
                                  <input
                                    type="date"
                                    value={blockDateInput || inspectorDate}
                                    onChange={(e) => setBlockDateInput(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-red-500 outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-gray-700 block">Custom Time Slot (e.g. 11:15 AM - 11:30 AM or Full Day)</label>
                                  <input
                                    type="text"
                                    value={blockTimeInput}
                                    onChange={(e) => setBlockTimeInput(e.target.value)}
                                    placeholder="e.g. 11:15 AM - 11:30 AM or Full Day"
                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-red-500 outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                     const currentScroll = mainScrollRef.current?.scrollTop;
                                     const dateVal = blockDateInput || inspectorDate;
                                     if (!dateVal) {
                                       triggerToast('⚠️ Please select a date');
                                       return;
                                     }
                                     const timeVal = blockTimeInput.trim() || 'Full Day';
                                     const currentBlocked = settings.blockedSlots || [];
                                     if (currentBlocked.some(b => b.date === dateVal && b.time === timeVal)) {
                                       triggerToast('⚠️ Already blocked');
                                       return;
                                     }
                                     const updated = [...currentBlocked, { date: dateVal, time: timeVal }];
                                     setSettings({ ...settings, blockedSlots: updated });
                                     saveSettings({ ...settings, blockedSlots: updated });
                                     setBlockTimeInput('');
                                     setShowCustomBlockForm(false);
                                     triggerToast(`✅ Blocked ${dateVal} (${timeVal})`);
                                     if (currentScroll !== undefined && mainScrollRef.current) {
                                       requestAnimationFrame(() => {
                                         if (mainScrollRef.current) mainScrollRef.current.scrollTop = currentScroll;
                                       });
                                     }
                                   }}
                                  className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                >
                                  Save Custom Block
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Per-Hour Filter Pills */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-800 block">Per-Hour Slot Filter:</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'all', label: 'All Hours (11 AM - 3 PM)' },
                                { id: '11-12', label: '11:00 AM - 12:00 PM' },
                                { id: '12-1', label: '12:00 PM - 01:00 PM' },
                                { id: '1-2', label: '01:00 PM - 02:00 PM' },
                                { id: '2-3', label: '02:00 PM - 03:00 PM' },
                              ].map((f) => (
                                <button
                                  type="button"
                                  key={f.id}
                                  onClick={() => setHourFilter(f.id as any)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    hourFilter === f.id
                                      ? 'bg-primary text-white border-primary shadow-2xs'
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Booked / Reserved Slots List View */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                                📋 Reserved / Booked Timing Slots List ({inspectorDate})
                              </h4>
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                                🛡️ Auto-Buffer: {(settings.autoReserveHourlyBufferSlots ?? true) ? 'ON (3 Slots/Hr)' : 'OFF'}
                              </span>
                            </div>

                            {/* Render List Items */}
                            {(() => {
                              const duration = settings.slotDurationMinutes || 3;
                              const bufferCount = settings.hourlyBufferCount ?? 3;
                              const isBufferEnabled = settings.autoReserveHourlyBufferSlots ?? true;

                              const hourBlocks = [
                                { id: '11-12', label: '11:00 AM - 12:00 PM', startMin: 660 },
                                { id: '12-1', label: '12:00 PM - 01:00 PM', startMin: 720 },
                                { id: '1-2', label: '01:00 PM - 02:00 PM', startMin: 780 },
                                { id: '2-3', label: '02:00 PM - 03:00 PM', startMin: 840 },
                              ].filter(h => hourFilter === 'all' || hourFilter === h.id);

                              const itemsList: {
                                time: string;
                                hourLabel: string;
                                type: 'auto-buffer' | 'custom-block';
                                isBlocked: boolean;
                              }[] = [];

                              for (const hBlock of hourBlocks) {
                                const totalSlots = Math.max(1, Math.floor(60 / duration));
                                for (let sIdx = 0; sIdx < totalSlots; sIdx++) {
                                  const slotMin = hBlock.startMin + sIdx * duration;
                                  const timeStr = minutesToTime(slotMin);

                                  let isBuffer = false;
                                  if (isBufferEnabled) {
                                    if (bufferCount >= 4) {
                                      isBuffer = (sIdx + 1) % Math.max(1, Math.floor(totalSlots / 4)) === 0;
                                    } else if (bufferCount === 2) {
                                      isBuffer = sIdx === Math.floor(totalSlots / 2) || sIdx === (totalSlots - 1);
                                    } else if (bufferCount === 1) {
                                      isBuffer = sIdx === (totalSlots - 1);
                                    } else {
                                      const step = Math.max(1, Math.floor(totalSlots / 4));
                                      isBuffer = (sIdx === step - 1 || sIdx === step * 2 - 1 || sIdx === step * 3 - 1);
                                    }
                                  }

                                  const isCustom = (settings.blockedSlots || []).some(
                                    (b) => b.date === inspectorDate && b.time === timeStr
                                  );

                                  if (isBuffer || isCustom) {
                                    const isCurrentlyBlocked = isCustom || (isBuffer && !(settings.blockedSlots || []).some(b => b.date === inspectorDate && b.time === `UNBLOCK_${timeStr}`));
                                    if (isCurrentlyBlocked) {
                                      itemsList.push({
                                        time: timeStr,
                                        hourLabel: hBlock.label,
                                        type: isCustom ? 'custom-block' : 'auto-buffer',
                                        isBlocked: true,
                                      });
                                    }
                                  }
                                }
                              }

                              (settings.blockedSlots || [])
                                .filter(b => b.date === inspectorDate && !b.time.startsWith('UNBLOCK_'))
                                .forEach(b => {
                                  if (!itemsList.some(item => item.time === b.time)) {
                                    itemsList.push({
                                      time: b.time,
                                      hourLabel: 'Custom Block',
                                      type: 'custom-block',
                                      isBlocked: true,
                                    });
                                  }
                                });

                              if (fetchingDateBookings) {
                                return (
                                  <div className="p-8 bg-purple-50/40 border border-purple-200 rounded-2xl text-center space-y-2 animate-pulse">
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-600 mx-auto" />
                                    <p className="text-xs font-bold text-purple-900">Refreshing slots & bookings for {inspectorDate}...</p>
                                  </div>
                                );
                              }

                              if (itemsList.length === 0) {
                                return (
                                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                                    <p className="text-xs text-gray-500 font-semibold italic">
                                      No active blocked or reserved slots for {inspectorDate} ({hourFilter === 'all' ? 'All Hours' : hourFilter}).
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-2">
                                  {itemsList.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className={`py-2.5 px-4 rounded-xl border flex items-center justify-between transition-all ${
                                        item.isBlocked
                                          ? 'bg-purple-50/50 border-purple-200 shadow-2xs'
                                          : 'bg-white border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      {/* Left: Time & Type Badge */}
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono font-bold text-gray-400 w-6">#{idx + 1}</span>
                                        <span className="text-xs font-black text-gray-900 w-20">{item.time}</span>
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                                          item.type === 'custom-block'
                                            ? 'bg-red-100 text-red-800 border border-red-200'
                                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                                        }`}>
                                          {item.type === 'custom-block' ? 'Custom Block' : 'Auto Buffer'}
                                        </span>
                                      </div>

                                      {/* Right: Status text & Toggle switch */}
                                      <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold ${item.isBlocked ? 'text-purple-700' : 'text-gray-400'}`}>
                                          {item.isBlocked ? 'ON (Booked)' : 'OFF (Available)'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentScroll = mainScrollRef.current?.scrollTop;
                                            const current = settings.blockedSlots || [];
                                            let updated;
                                            if (item.type === 'custom-block') {
                                              updated = current.filter(b => !(b.date === inspectorDate && b.time === item.time));
                                              triggerToast(`🟢 Unblocked custom slot ${item.time}`);
                                            } else {
                                              if (item.isBlocked) {
                                                updated = [...current, { date: inspectorDate, time: `UNBLOCK_${item.time}` }];
                                                triggerToast(`🟢 Toggled OFF (Available) for ${item.time}`);
                                              } else {
                                                updated = current.filter(b => !(b.date === inspectorDate && b.time === `UNBLOCK_${item.time}`));
                                                triggerToast(`🛡️ Toggled ON (Reserved) for ${item.time}`);
                                              }
                                            }
                                            setSettings({ ...settings, blockedSlots: updated });
                                            saveSettings({ ...settings, blockedSlots: updated });
                                            if (currentScroll !== undefined && mainScrollRef.current) {
                                              requestAnimationFrame(() => {
                                                if (mainScrollRef.current) mainScrollRef.current.scrollTop = currentScroll;
                                              });
                                            }
                                          }}
                                          className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                                            item.isBlocked ? 'bg-purple-600' : 'bg-gray-300'
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                                            item.isBlocked ? 'translate-x-5' : 'translate-x-0'
                                          }`} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={loading || isSavingSettings}
                        onClick={() => saveSettings(settings)}
                        className={`w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md outline-none cursor-pointer text-xs uppercase tracking-wider transition-all ${
                          isSavedSuccess
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-400'
                            : isSavingSettings
                            ? 'bg-amber-600 text-white'
                            : 'bg-gradient-to-r from-primary to-accent hover:brightness-105 text-white'
                        }`}
                      >
                        {isSavingSettings ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Saving Booking Rules Settings...</span>
                          </>
                        ) : isSavedSuccess ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-white" />
                            <span>Settings Saved!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 text-emerald-300" />
                            <span>Save Booking Rules Settings</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* PATIENT SUPPORT TICKETS & HELPDESK */}
              {tab === 'support' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
                    <div>
                      <h2 className="font-playfair text-2xl font-black text-gray-900 flex items-center gap-2">
                        <LifeBuoy className="w-6 h-6 text-teal-600" /> Patient Support Tickets & Helpdesk
                      </h2>
                      <p className="text-xs text-gray-500 font-semibold mt-1">
                        View patient support queries, booking help requests, and reply directly to resolve tickets.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full border border-rose-200">
                        🔴 {supportTickets.filter(t => t.status === 'open').length} Open Tickets
                      </span>
                      <button
                        onClick={refresh}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                        title="Refresh Support Tickets"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                      { id: 'all', label: 'All Tickets', count: supportTickets.length },
                      { id: 'open', label: '🔴 Open', count: supportTickets.filter(t => t.status === 'open').length },
                      { id: 'in_progress', label: '⏳ In Progress', count: supportTickets.filter(t => t.status === 'in_progress').length },
                      { id: 'resolved', label: '✅ Resolved', count: supportTickets.filter(t => t.status === 'resolved').length },
                    ].map((filterItem) => (
                      <button
                        key={filterItem.id}
                        onClick={() => setTicketStatusFilter(filterItem.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                          ticketStatusFilter === filterItem.id
                            ? 'bg-[#0B1B29] text-white border-[#0B1B29] shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span>{filterItem.label}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-800">
                          {filterItem.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Tickets List Grid */}
                  {supportTickets.filter(t => ticketStatusFilter === 'all' ? true : t.status === ticketStatusFilter).length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-3">
                      <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto" />
                      <h3 className="font-playfair text-lg font-bold text-gray-700">कोई सपोर्ट टिकट नहीं मिला / No tickets found</h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        अभी इस फ़िल्टर में कोई पेशेंट सहायता टिकट दर्ज नहीं है। New patient support requests will appear here with red notification badges.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {supportTickets
                        .filter(t => ticketStatusFilter === 'all' ? true : t.status === ticketStatusFilter)
                        .map((ticket) => (
                          <div
                            key={ticket.id}
                            className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                              ticket.status === 'open'
                                ? 'border-rose-300 ring-1 ring-rose-300/50 bg-rose-50/10'
                                : ticket.status === 'in_progress'
                                ? 'border-amber-300 bg-amber-50/10'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-mono text-[10px] font-black text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    {ticket.ticketId}
                                  </span>
                                  <h3 className="font-playfair text-base font-bold text-gray-900 mt-1">
                                    {ticket.subject}
                                  </h3>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border shrink-0 ${
                                    ticket.status === 'open'
                                      ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                      : ticket.status === 'in_progress'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  }`}
                                >
                                  {ticket.status === 'open' ? '🔴 Open' : ticket.status === 'in_progress' ? '⏳ In Progress' : '✅ Resolved'}
                                </span>
                              </div>

                              <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-150 whitespace-pre-wrap">
                                {ticket.message}
                              </p>

                              {ticket.reply && (
                                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 space-y-1">
                                  <span className="text-[10px] font-black text-teal-800 uppercase block">💬 Staff Response:</span>
                                  <p className="text-xs text-teal-900 font-medium">{ticket.reply}</p>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-gray-150 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-bold text-gray-900">{ticket.name}</p>
                                <p className="text-[11px] text-gray-500 font-mono">{ticket.phone}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://wa.me/91${ticket.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200"
                                  title="WhatsApp Patient"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => {
                                    setReplyModalTicket(ticket);
                                    setReplyText(ticket.reply || '');
                                  }}
                                  className="px-3 py-1.5 bg-[#0B1B29] text-white rounded-xl text-xs font-bold hover:bg-[#112334] transition-colors shadow-xs flex items-center gap-1"
                                >
                                  <span>Reply / Resolve</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Reply Modal */}
                  {replyModalTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                      <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                          <div>
                            <h3 className="font-playfair text-base font-bold text-gray-900">
                              Reply to Ticket {replyModalTicket.ticketId}
                            </h3>
                            <p className="text-xs text-gray-500">{replyModalTicket.name} ({replyModalTicket.phone})</p>
                          </div>
                          <button
                            onClick={() => setReplyModalTicket(null)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Response Message for Patient</label>
                            <textarea
                              rows={4}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="यहाँ अपना उत्तर/समाधान लिखें..."
                              className="w-full p-3 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={async () => {
                                if (!replyModalTicket) return;
                                await fetch('/api/support', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: replyModalTicket.id, status: 'resolved', reply: replyText }),
                                });
                                setReplyModalTicket(null);
                                refresh();
                                triggerToast('Ticket marked as Resolved!');
                              }}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              ✅ Save Response & Resolve
                            </button>
                            <button
                              onClick={async () => {
                                if (!replyModalTicket) return;
                                await fetch('/api/support', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: replyModalTicket.id, status: 'in_progress', reply: replyText }),
                                });
                                setReplyModalTicket(null);
                                refresh();
                                triggerToast('Ticket status updated to In Progress');
                              }}
                              className="px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              ⏳ Mark In Progress
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
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
                          blogs.map((post, idx) => (
                            <div key={post._id || `${post.id || 'blog'}-${idx}`} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-lg bg-gray-100 border shrink-0 overflow-hidden relative">
                                  <img src={post.imageUrl || 'https://picsum.photos/seed/skin/150/150'} alt="thumbnail" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-700 text-[8px] font-bold uppercase">
                                      {post.category}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${post.status === 'published' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-gray-100 border border-gray-200 text-gray-500'
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

              {/* DYNAMIC GLOBAL SETTINGS & WEBSITE CONTENT CMS */}
              {tab === 'cms' && (
                <div className="space-y-6">
                  {/* Top Header Row */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-200 pb-4">
                    <div>
                      <h2 className="font-playfair text-2.5xl font-black text-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-emerald-600" /> Global Settings & Website Content
                      </h2>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">
                        Edit all user-facing website text, prices, doctor profile details, before/after photos, video links, certificates, reviews, and contact info in one place.
                      </p>
                    </div>
                    {cms && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => saveCms(cms)}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-md transition-all outline-none cursor-pointer shrink-0"
                      >
                        <Save className="w-4 h-4 text-emerald-200" />
                        {loading ? 'Saving Changes...' : 'Save All Changes'}
                      </button>
                    )}
                  </div>

                  {/* 8 Sub-Tab Navigation Pill Bar */}
                  <div className="flex items-center gap-1.5 p-1.5 bg-gray-200/80 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
                    {[
                      { id: 'hero' as const, label: 'Hero & Banner', icon: '🎨' },
                      { id: 'about' as const, label: 'Doctor & About', icon: '👨‍⚕️' },
                      { id: 'services' as const, label: 'Services & Fees', icon: '🩺' },
                      { id: 'before-after' as const, label: 'Before & After', icon: '📸' },
                      { id: 'videos' as const, label: 'Videos & Reels', icon: '📹' },
                      { id: 'certificates' as const, label: 'Certificates', icon: '🎓' },
                      { id: 'faqs' as const, label: 'Reviews & FAQs', icon: '⭐' },
                      { id: 'contact' as const, label: 'Contact & Footer', icon: '📞' },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setCmsTab(sub.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                          cmsTab === sub.id
                            ? 'bg-emerald-600 text-white shadow-md font-black scale-105'
                            : 'text-gray-700 hover:bg-white/80 hover:text-gray-900'
                        }`}
                      >
                        <span className="text-sm">{sub.icon}</span>
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>

                  {!cms ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3 shadow-2xs animate-pulse">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-gray-700">Loading homepage CMS blocks & content...</p>
                      <p className="text-[10px] text-gray-400 font-medium">Fetching website CMS data from server...</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-6 text-left">
                      {/* SUB-TAB 1: HERO & BANNER */}
                      {cmsTab === 'hero' && (
                        <div className="space-y-6">
                          {/* Announcement Banner Alert */}
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

                          {/* Hero Headlines & Subtitle */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Homepage Hero Text & Headlines</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Primary hero section title lines and introduction paragraph</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Headline Line 1 (Green/Accent)</label>
                                <input
                                  type="text"
                                  value={cms.heroTitleLine1}
                                  onChange={(e) => setCms({ ...cms, heroTitleLine1: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Headline Line 2 (Dark Text)</label>
                                <input
                                  type="text"
                                  value={cms.heroTitleLine2}
                                  onChange={(e) => setCms({ ...cms, heroTitleLine2: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Hero Subtitle Badge Tagline</label>
                              <input
                                type="text"
                                value={cms.heroSubtitle}
                                onChange={(e) => setCms({ ...cms, heroSubtitle: e.target.value })}
                                className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                              />
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Hero Paragraph Description</label>
                              <textarea
                                rows={3}
                                value={cms.heroDescription}
                                onChange={(e) => setCms({ ...cms, heroDescription: e.target.value })}
                                className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                              />
                            </div>
                          </div>

                          {/* Hero Trust Badges & Experience Text */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Hero Trust Badges & Counters</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Pill labels and experience metrics shown on hero card</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Badge 1 (Top Left)</label>
                                <input
                                  type="text"
                                  value={cms.heroBadge1}
                                  onChange={(e) => setCms({ ...cms, heroBadge1: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Badge 2 (Top Right)</label>
                                <input
                                  type="text"
                                  value={cms.heroBadge2}
                                  onChange={(e) => setCms({ ...cms, heroBadge2: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Experience Counter Badge (e.g. 12+ Yrs)</label>
                                <input
                                  type="text"
                                  value={cms.heroExperienceBadge}
                                  onChange={(e) => setCms({ ...cms, heroExperienceBadge: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Experience Label Text</label>
                                <input
                                  type="text"
                                  value={cms.heroExperienceText}
                                  onChange={(e) => setCms({ ...cms, heroExperienceText: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Hero Clinic/Doctor Image */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Hero Main Banner Image</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Featured hero photo on homepage right panel</p>
                              </div>
                            </div>

                            <div className="flex flex-col space-y-3">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Image URL or Upload File</label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                                <div className="sm:col-span-2 space-y-2">
                                  <input
                                    type="text"
                                    value={cms.heroImageUrl}
                                    onChange={(e) => setCms({ ...cms, heroImageUrl: e.target.value })}
                                    className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-sky-500"
                                  />
                                  <div className="p-3 border border-dashed rounded-xl bg-gray-50 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Upload Hero Photo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleFileUpload(e, (url) => setCms({ ...cms, heroImageUrl: url }))}
                                      className="text-xs text-gray-500 cursor-pointer"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-center sm:justify-start">
                                  {cms.heroImageUrl ? (
                                    <div className="w-24 h-24 border rounded-xl overflow-hidden bg-gray-50 shadow-inner">
                                      <img src={cms.heroImageUrl} alt="Hero preview" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-24 h-24 border-2 border-dashed rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-[9px] uppercase">
                                      No Image
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 2: DOCTOR & ABOUT */}
                      {cmsTab === 'about' && (
                        <div className="space-y-6">
                          {/* Doctor Biography & Subtitles */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                <Users className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Doctor Profile & About Section</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Doctor name, specialty subtitle, and detailed clinical bio</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Doctor Title / Name</label>
                                <input
                                  type="text"
                                  value={cms.aboutTitle}
                                  onChange={(e) => setCms({ ...cms, aboutTitle: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Specialty / Role Subtitle</label>
                                <input
                                  type="text"
                                  value={cms.aboutSubtitle}
                                  onChange={(e) => setCms({ ...cms, aboutSubtitle: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Detailed Biography Paragraph</label>
                              <textarea
                                rows={4}
                                value={cms.aboutDescription}
                                onChange={(e) => setCms({ ...cms, aboutDescription: e.target.value })}
                                className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-gray-50/50 focus:bg-white focus:border-teal-500"
                              />
                            </div>
                          </div>

                          {/* Doctor Portrait Photo */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Doctor Official Portrait Photo</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Displayed in the About Dr. Prateek section</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                              <div className="sm:col-span-2 space-y-2">
                                <input
                                  type="text"
                                  value={cms.aboutDoctorImage}
                                  onChange={(e) => setCms({ ...cms, aboutDoctorImage: e.target.value })}
                                  className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-indigo-500"
                                />
                                <div className="p-3 border border-dashed rounded-xl bg-gray-50 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase">Upload Doctor Photo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, (url) => setCms({ ...cms, aboutDoctorImage: url }))}
                                    className="text-xs text-gray-500 cursor-pointer"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-center sm:justify-start">
                                {cms.aboutDoctorImage ? (
                                  <div className="w-24 h-24 border rounded-xl overflow-hidden bg-gray-50 shadow-inner">
                                    <img src={cms.aboutDoctorImage} alt="Doctor portrait" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-24 h-24 border-2 border-dashed rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-[9px] uppercase">
                                    No Image
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Stats Counters */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">About Clinical Statistics (4 Slots)</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Key achievement numbers shown below doctor bio</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(cms.aboutStats || []).map((st, sIdx) => (
                                <div key={sIdx} className="p-3 border border-gray-200 rounded-xl bg-gray-50/50 flex gap-2">
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[9px] font-black uppercase text-gray-500">Stat {sIdx + 1} Value</span>
                                    <input
                                      type="text"
                                      value={st.value}
                                      onChange={(e) => {
                                        const newStats = [...cms.aboutStats];
                                        newStats[sIdx] = { ...newStats[sIdx], value: e.target.value };
                                        setCms({ ...cms, aboutStats: newStats });
                                      }}
                                      className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold bg-white focus:border-emerald-500 outline-none"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[9px] font-black uppercase text-gray-500">Label</span>
                                    <input
                                      type="text"
                                      value={st.label}
                                      onChange={(e) => {
                                        const newStats = [...cms.aboutStats];
                                        newStats[sIdx] = { ...newStats[sIdx], label: e.target.value };
                                        setCms({ ...cms, aboutStats: newStats });
                                      }}
                                      className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold bg-white focus:border-emerald-500 outline-none"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Doctor Qualifications & Degrees */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between border-b pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                  <Award className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-playfair font-bold text-base text-gray-900">Doctor Degrees & Qualifications</h3>
                                  <p className="text-[10px] text-gray-500 font-semibold">Bullet qualifications list shown on website</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const deg = prompt('Enter Qualification / Degree title:');
                                  if (deg) {
                                    setCms({ ...cms, aboutCredentials: [...(cms.aboutCredentials || []), deg] });
                                  }
                                }}
                                className="py-2 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Degree
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(cms.aboutCredentials || []).map((cred, cIdx) => (
                                <div key={cIdx} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50/60 hover:bg-white transition-all">
                                  <span className="text-xs font-bold text-gray-800">🎓 {cred}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = cms.aboutCredentials.filter((_, i) => i !== cIdx);
                                      setCms({ ...cms, aboutCredentials: updated });
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 3: SERVICES & FEES */}
                      {cmsTab === 'services' && (
                        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Clinical Services & Treatments Manager</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Manage all dynamic treatments, fees, and descriptions on user site</p>
                              </div>
                            </div>

                            {serviceFormMode === 'list' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setServiceForm({ name: '', description: '', price: '' });
                                  setServiceFormMode('create');
                                }}
                                className="py-2 px-3.5 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add New Treatment
                              </button>
                            )}
                          </div>

                          {serviceFormMode === 'list' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {cms.services && cms.services.length > 0 ? (
                                cms.services.map((serv, idx) => (
                                  <div key={serv.id || idx} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 flex items-start justify-between gap-3 hover:bg-white transition-all shadow-2xs">
                                    <div className="space-y-0.5 text-left">
                                      <p className="text-xs font-black text-gray-900 leading-tight">{serv.name}</p>
                                      <p className="text-[10px] font-bold text-teal-600">{formatPrice(serv.price)}</p>
                                      <p className="text-[10px] text-gray-500 font-semibold line-clamp-2 leading-relaxed">{serv.description}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setServiceForm({
                                            name: serv.name,
                                            description: serv.description,
                                            price: serv.price,
                                          });
                                          setActiveServiceIdx(idx);
                                          setServiceFormMode('edit');
                                        }}
                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        title="Edit Treatment"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteService(idx)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Treatment"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500 italic py-4 col-span-2 text-left">No treatments defined yet.</p>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 border border-teal-150 rounded-2xl bg-teal-50/15 space-y-4 text-left">
                              <h4 className="font-playfair font-bold text-xs text-teal-800 uppercase tracking-widest">
                                {serviceFormMode === 'create' ? 'Create New Treatment' : 'Edit Treatment Details'}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Treatment Name</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Acne & Scar Treatment"
                                    value={serviceForm.name}
                                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-teal-500"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Price Indicator / Fee</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. From ₹800/session"
                                    value={serviceForm.price}
                                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-teal-500"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Detailed Description</label>
                                <textarea
                                  rows={3}
                                  placeholder="Describe the treatment benefits, process, sessions, etc."
                                  value={serviceForm.description}
                                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                                  className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-white focus:border-teal-500"
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setServiceFormMode('list');
                                    setActiveServiceIdx(null);
                                  }}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveService}
                                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5 shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {serviceFormMode === 'create' ? 'Add Treatment' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-TAB 4: BEFORE & AFTER */}
                      {cmsTab === 'before-after' && (
                        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Before & After Clinical Transformations</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Manage real patient result comparison photos on homepage</p>
                              </div>
                            </div>

                            {baFormMode === 'list' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBaForm({ treatment: '', duration: '', sessions: '', tag: '', beforeSrc: '', afterSrc: '' });
                                  setBaFormMode('create');
                                }}
                                className="py-2 px-3.5 bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Transformation Case
                              </button>
                            )}
                          </div>

                          {baFormMode === 'list' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(cms.beforeAfterCases || []).length > 0 ? (
                                cms.beforeAfterCases!.map((item, idx) => (
                                  <div key={item.id || idx} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 space-y-3 hover:bg-white transition-all shadow-2xs">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-pink-100 text-pink-800">{item.tag}</span>
                                        <h4 className="text-xs font-black text-gray-900 mt-1">{item.treatment}</h4>
                                        <p className="text-[10px] text-gray-500 font-semibold">{item.duration} • {item.sessions}</p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBaForm({
                                              treatment: item.treatment,
                                              duration: item.duration,
                                              sessions: item.sessions,
                                              tag: item.tag,
                                              beforeSrc: item.beforeSrc,
                                              afterSrc: item.afterSrc,
                                            });
                                            setActiveBaIdx(idx);
                                            setBaFormMode('edit');
                                          }}
                                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteBeforeAfter(idx)}
                                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                      <div className="relative h-24 rounded-lg overflow-hidden border bg-gray-100">
                                        <img src={item.beforeSrc} alt="Before" className="w-full h-full object-cover" />
                                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">BEFORE</span>
                                      </div>
                                      <div className="relative h-24 rounded-lg overflow-hidden border bg-gray-100">
                                        <img src={item.afterSrc} alt="After" className="w-full h-full object-cover" />
                                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">AFTER</span>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500 italic py-4 col-span-2 text-left">No transformation cases added yet.</p>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 border border-pink-150 rounded-2xl bg-pink-50/15 space-y-4 text-left">
                              <h4 className="font-playfair font-bold text-xs text-pink-800 uppercase tracking-widest">
                                {baFormMode === 'create' ? 'Add Transformation Case' : 'Edit Transformation Case'}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Treatment Name</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Severe Acne Scar Resurfacing"
                                    value={baForm.treatment}
                                    onChange={(e) => setBaForm({ ...baForm, treatment: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-pink-500"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Category Tag</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Acne Care"
                                    value={baForm.tag}
                                    onChange={(e) => setBaForm({ ...baForm, tag: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-pink-500"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Time Duration</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 6 Weeks"
                                    value={baForm.duration}
                                    onChange={(e) => setBaForm({ ...baForm, duration: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-pink-500"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Number of Sessions</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 4 Sessions"
                                    value={baForm.sessions}
                                    onChange={(e) => setBaForm({ ...baForm, sessions: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-pink-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                {/* Before Photo Upload */}
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Before Image Photo</label>
                                  <input
                                    type="text"
                                    placeholder="Image URL"
                                    value={baForm.beforeSrc}
                                    onChange={(e) => setBaForm({ ...baForm, beforeSrc: e.target.value })}
                                    className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-pink-500"
                                  />
                                  <div className="p-2.5 border border-dashed rounded-xl bg-white flex items-center justify-between">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase">Upload Before Photo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleFileUpload(e, (url) => setBaForm({ ...baForm, beforeSrc: url }))}
                                      className="text-xs text-gray-500 cursor-pointer"
                                    />
                                  </div>
                                </div>

                                {/* After Photo Upload */}
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">After Image Photo</label>
                                  <input
                                    type="text"
                                    placeholder="Image URL"
                                    value={baForm.afterSrc}
                                    onChange={(e) => setBaForm({ ...baForm, afterSrc: e.target.value })}
                                    className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-pink-500"
                                  />
                                  <div className="p-2.5 border border-dashed rounded-xl bg-white flex items-center justify-between">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase">Upload After Photo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleFileUpload(e, (url) => setBaForm({ ...baForm, afterSrc: url }))}
                                      className="text-xs text-gray-500 cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBaFormMode('list');
                                    setActiveBaIdx(null);
                                  }}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveBeforeAfter}
                                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5 shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {baFormMode === 'create' ? 'Add Case' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-TAB 5: VIDEOS & REELS */}
                      {cmsTab === 'videos' && (
                        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                                <Video className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Videos & Educational Reels</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Embed YouTube/Vimeo tutorials and clinical procedure reels</p>
                              </div>
                            </div>

                            {videoFormMode === 'list' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setVideoForm({ title: '', desc: '', duration: '', videoUrl: '', thumbnail: '' });
                                  setVideoFormMode('create');
                                }}
                                className="py-2 px-3.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Video
                              </button>
                            )}
                          </div>

                          {videoFormMode === 'list' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(cms.videos || []).length > 0 ? (
                                cms.videos!.map((vid, idx) => (
                                  <div key={vid.id || idx} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 flex items-start gap-3 hover:bg-white transition-all shadow-2xs">
                                    <div className="w-20 h-16 rounded-xl bg-gray-200 border overflow-hidden shrink-0 relative">
                                      <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[8px] font-bold px-1 rounded">{vid.duration}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                      <p className="text-xs font-black text-gray-900 truncate">{vid.title}</p>
                                      <p className="text-[10px] text-gray-500 line-clamp-1">{vid.desc}</p>
                                      <p className="text-[9px] font-mono text-red-600 truncate">{vid.videoUrl}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setVideoForm({
                                            title: vid.title,
                                            desc: vid.desc,
                                            duration: vid.duration,
                                            videoUrl: vid.videoUrl,
                                            thumbnail: vid.thumbnail,
                                          });
                                          setActiveVideoIdx(idx);
                                          setVideoFormMode('edit');
                                        }}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteVideo(idx)}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500 italic py-4 col-span-2 text-left">No video tutorials configured.</p>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 border border-red-150 rounded-2xl bg-red-50/15 space-y-4 text-left">
                              <h4 className="font-playfair font-bold text-xs text-red-800 uppercase tracking-widest">
                                {videoFormMode === 'create' ? 'Add New Video' : 'Edit Video Details'}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Video Title</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Post-Procedure Laser Care Tips"
                                    value={videoForm.title}
                                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-red-500"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Video Duration</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 4:15"
                                    value={videoForm.duration}
                                    onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-red-500"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">YouTube / Video Embed URL</label>
                                <input
                                  type="text"
                                  placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ"
                                  value={videoForm.videoUrl}
                                  onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                                  className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-red-500 font-mono"
                                />
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Short Video Summary</label>
                                <textarea
                                  rows={2}
                                  placeholder="Brief explanation of video content"
                                  value={videoForm.desc}
                                  onChange={(e) => setVideoForm({ ...videoForm, desc: e.target.value })}
                                  className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-white focus:border-red-500"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Custom Thumbnail Image</label>
                                <input
                                  type="text"
                                  placeholder="Thumbnail Image URL"
                                  value={videoForm.thumbnail}
                                  onChange={(e) => setVideoForm({ ...videoForm, thumbnail: e.target.value })}
                                  className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-red-500"
                                />
                                <div className="p-2.5 border border-dashed rounded-xl bg-white flex items-center justify-between">
                                  <span className="text-[9px] text-gray-500 font-bold uppercase">Upload Custom Cover Thumbnail</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, (url) => setVideoForm({ ...videoForm, thumbnail: url }))}
                                    className="text-xs text-gray-500 cursor-pointer"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVideoFormMode('list');
                                    setActiveVideoIdx(null);
                                  }}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveVideo}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5 shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {videoFormMode === 'create' ? 'Add Video' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-TAB 6: CERTIFICATES */}
                      {cmsTab === 'certificates' && (
                        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Doctor Certificates & Credentials</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Manage board certifications and medical degree credentials</p>
                              </div>
                            </div>

                            {certFormMode === 'list' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCertForm({ title: '', institution: '', image: '' });
                                  setCertFormMode('create');
                                }}
                                className="py-2 px-3.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add New Certificate
                              </button>
                            )}
                          </div>

                          {certFormMode === 'list' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {cms.certificates && cms.certificates.length > 0 ? (
                                cms.certificates.map((cert, idx) => (
                                  <div key={cert.id || idx} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 flex items-start justify-between gap-3 hover:bg-white transition-all shadow-2xs">
                                    <div className="flex items-start gap-3 text-left">
                                      <div className="w-14 h-14 bg-gray-100 border rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        <img src={cert.image} alt={cert.title} className="w-full h-full object-contain" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-black text-gray-900 leading-tight">{cert.title}</p>
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{cert.institution}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCertForm({
                                            title: cert.title,
                                            institution: cert.institution,
                                            image: cert.image,
                                          });
                                          setActiveCertIdx(idx);
                                          setCertFormMode('edit');
                                        }}
                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        title="Edit Certificate"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCertificate(idx)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Certificate"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500 italic py-4 col-span-2 text-left">No certificates configured yet.</p>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 border border-indigo-150 rounded-2xl bg-indigo-50/15 space-y-4 text-left">
                              <h4 className="font-playfair font-bold text-xs text-indigo-800 uppercase tracking-widest">
                                {certFormMode === 'create' ? 'Add New Certificate' : 'Edit Certificate Details'}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Certificate Title</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Board Certified in Dermatology"
                                    value={certForm.title}
                                    onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-indigo-500"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Issuing Institution</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. IADVL"
                                    value={certForm.institution}
                                    onChange={(e) => setCertForm({ ...certForm, institution: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Certificate Image</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                                  <div className="sm:col-span-2 space-y-2">
                                    <input
                                      type="text"
                                      placeholder="Image URL or Path (e.g. /assets/cert1.png)"
                                      value={certForm.image}
                                      onChange={(e) => setCertForm({ ...certForm, image: e.target.value })}
                                      className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-indigo-500"
                                    />
                                    <div className="p-2.5 border border-dashed rounded-xl bg-white flex items-center justify-between">
                                      <span className="text-[9px] text-gray-500 font-bold uppercase">Upload Certificate File</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, (url) => setCertForm({ ...certForm, image: url }))}
                                        className="text-xs text-gray-500 cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-center sm:justify-start">
                                    {certForm.image ? (
                                      <div className="w-20 h-20 border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
                                        <img src={certForm.image} alt="Preview" className="max-w-full max-h-full object-contain" />
                                      </div>
                                    ) : (
                                      <div className="w-20 h-20 border-2 border-dashed rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-[9px] uppercase">
                                        No Image
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCertFormMode('list');
                                    setActiveCertIdx(null);
                                  }}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveCertificate}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5 shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {certFormMode === 'create' ? 'Add Certificate' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-TAB 7: REVIEWS & FAQS */}
                      {cmsTab === 'faqs' && (
                        <div className="space-y-6">
                          {/* Testimonials Segment */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between border-b pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-playfair font-bold text-base text-gray-900">Patient Testimonials & Reviews</h3>
                                  <p className="text-[10px] text-gray-500 font-semibold">Featured patient feedback cards shown on website</p>
                                </div>
                              </div>

                              {testimonialFormMode === 'list' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTestimonialForm({ name: '', role: 'Patient', rating: 5, text: '' });
                                    setTestimonialFormMode('create');
                                  }}
                                  className="py-2 px-3.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add Review Card
                                </button>
                              )}
                            </div>

                            {testimonialFormMode === 'list' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(cms.testimonials || []).map((test, idx) => (
                                  <div key={idx} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 space-y-2 relative hover:bg-white transition-all shadow-2xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-black text-gray-900">{test.name} • <span className="text-teal-700 font-semibold">{test.role}</span></span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setTestimonialForm({ name: test.name, role: test.role, rating: test.rating || 5, text: test.text });
                                            setActiveTestimonialIdx(idx);
                                            setTestimonialFormMode('edit');
                                          }}
                                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTestimonial(idx)}
                                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-gray-600 font-semibold italic leading-relaxed">&ldquo;{test.text}&rdquo;</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 border border-amber-150 rounded-2xl bg-amber-50/15 space-y-4 text-left">
                                <h4 className="font-playfair font-bold text-xs text-amber-800 uppercase tracking-widest">
                                  {testimonialFormMode === 'create' ? 'Add Review Card' : 'Edit Review Card'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex flex-col">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Patient Name</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Ananya Sharma"
                                      value={testimonialForm.name}
                                      onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                                      className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-amber-500"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Treatment / Role</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Acne Laser Patient"
                                      value={testimonialForm.role}
                                      onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                                      className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-amber-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Review Comment</label>
                                  <textarea
                                    rows={3}
                                    placeholder="Patient's testimonial feedback"
                                    value={testimonialForm.text}
                                    onChange={(e) => setTestimonialForm({ ...testimonialForm, text: e.target.value })}
                                    className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-white focus:border-amber-500"
                                  />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTestimonialFormMode('list');
                                      setActiveTestimonialIdx(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveTestimonial}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    {testimonialFormMode === 'create' ? 'Add Review' : 'Save Changes'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* FAQs Segment */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center justify-between border-b pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                  <HelpCircle className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-playfair font-bold text-base text-gray-900">Frequently Asked Questions (FAQs)</h3>
                                  <p className="text-[10px] text-gray-500 font-semibold">Q&A accordion items displayed on public website</p>
                                </div>
                              </div>

                              {faqFormMode === 'list' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFaqForm({ question: '', answer: '' });
                                    setFaqFormMode('create');
                                  }}
                                  className="py-2 px-3.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add FAQ Item
                                </button>
                              )}
                            </div>

                            {faqFormMode === 'list' ? (
                              <div className="space-y-3">
                                {(cms.faqs || []).map((faq, idx) => (
                                  <div key={idx} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/60 space-y-1.5 relative hover:bg-white transition-all shadow-2xs">
                                    <div className="flex justify-between items-start gap-2">
                                      <h4 className="text-xs font-black text-gray-900">Q: {faq.question}</h4>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFaqForm({ question: faq.question, answer: faq.answer });
                                            setActiveFaqIdx(idx);
                                            setFaqFormMode('edit');
                                          }}
                                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteFaq(idx)}
                                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-gray-600 font-semibold leading-relaxed">A: {faq.answer}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 border border-blue-150 rounded-2xl bg-blue-50/15 space-y-4 text-left">
                                <h4 className="font-playfair font-bold text-xs text-blue-800 uppercase tracking-widest">
                                  {faqFormMode === 'create' ? 'Add FAQ Item' : 'Edit FAQ Item'}
                                </h4>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Question</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. How many laser sessions are required for acne scars?"
                                    value={faqForm.question}
                                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                                    className="px-3.5 py-2 border rounded-xl text-xs font-semibold outline-none bg-white focus:border-blue-500"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Detailed Answer</label>
                                  <textarea
                                    rows={3}
                                    placeholder="Clear clinical answer for patients"
                                    value={faqForm.answer}
                                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                                    className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-white focus:border-blue-500"
                                  />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFaqFormMode('list');
                                      setActiveFaqIdx(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveFaq}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer outline-none flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    {faqFormMode === 'create' ? 'Add FAQ' : 'Save Changes'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB 8: CONTACT & FOOTER */}
                      {cmsTab === 'contact' && (
                        <div className="space-y-6">
                          {/* Clinic Address & Contact Information */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <PhoneCall className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Clinic Address & Communication Channels</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Phone, WhatsApp, email, timings, and map location</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Primary Phone Number</label>
                                <input
                                  type="text"
                                  value={cms.contactPhone}
                                  onChange={(e) => setCms({ ...cms, contactPhone: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">WhatsApp Contact Number</label>
                                <input
                                  type="text"
                                  value={cms.contactWhatsapp}
                                  onChange={(e) => setCms({ ...cms, contactWhatsapp: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Official Email Address</label>
                                <input
                                  type="text"
                                  value={cms.contactEmail}
                                  onChange={(e) => setCms({ ...cms, contactEmail: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">OPD Timings Text</label>
                                <input
                                  type="text"
                                  value={cms.contactTimings}
                                  onChange={(e) => setCms({ ...cms, contactTimings: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Physical Clinic Address</label>
                              <input
                                type="text"
                                value={cms.contactAddress}
                                onChange={(e) => setCms({ ...cms, contactAddress: e.target.value })}
                                className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500"
                              />
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Google Maps Embed iframe URL</label>
                              <input
                                type="text"
                                value={cms.googleMapsEmbed}
                                onChange={(e) => setCms({ ...cms, googleMapsEmbed: e.target.value })}
                                className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-emerald-500 font-mono"
                              />
                            </div>
                          </div>

                          {/* Social Media Channels */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                <Send className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Social Media & Channel Links</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Footer and top bar social handle redirect links</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Instagram URL</label>
                                <input
                                  type="text"
                                  value={cms.instagramUrl}
                                  onChange={(e) => setCms({ ...cms, instagramUrl: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-purple-500 font-mono"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Facebook URL</label>
                                <input
                                  type="text"
                                  value={cms.facebookUrl}
                                  onChange={(e) => setCms({ ...cms, facebookUrl: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-purple-500 font-mono"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">YouTube Channel URL</label>
                                <input
                                  type="text"
                                  value={cms.youtubeUrl}
                                  onChange={(e) => setCms({ ...cms, youtubeUrl: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-purple-500 font-mono"
                                />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Twitter / X URL</label>
                                <input
                                  type="text"
                                  value={cms.twitterUrl}
                                  onChange={(e) => setCms({ ...cms, twitterUrl: e.target.value })}
                                  className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-purple-500 font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Footer & Copyright Text */}
                          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 border-b pb-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-playfair font-bold text-base text-gray-900">Website Footer & Copyright Notice</h3>
                                <p className="text-[10px] text-gray-500 font-semibold">Footer summary sentence and copyright notice</p>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Footer Description Paragraph</label>
                              <textarea
                                rows={2}
                                value={cms.footerText}
                                onChange={(e) => setCms({ ...cms, footerText: e.target.value })}
                                className="p-3 border rounded-xl text-xs font-semibold resize-none outline-none bg-gray-50/50 focus:bg-white focus:border-slate-500"
                              />
                            </div>

                            <div className="flex flex-col">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Copyright Notice Line</label>
                              <input
                                type="text"
                                value={cms.copyrightText}
                                onChange={(e) => setCms({ ...cms, copyrightText: e.target.value })}
                                className="px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-slate-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bottom Sticky Save Button */}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => saveCms(cms)}
                        className="w-full py-4 bg-gradient-to-r from-[#0B1B29] via-[#1B4F72] to-emerald-600 hover:brightness-110 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all outline-none cursor-pointer uppercase text-xs tracking-wider"
                      >
                        <Save className="w-4 h-4 text-emerald-300" />
                        {loading ? 'Saving Changes...' : 'Save All Changes'}
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
                        className={`p-3 border rounded-xl text-xs space-y-1 relative transition-all ${notif.read ? 'bg-white text-gray-500' : 'bg-primary/5 text-gray-800 border-primary/20 shadow-xs'
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
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${tab === t.id ? 'text-white' : 'text-white/40'
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

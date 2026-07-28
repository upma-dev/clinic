'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Phone, 
  Lock, 
  Calendar, 
  Clock, 
  Ticket, 
  LogOut, 
  User, 
  MessageCircle, 
  Activity, 
  AlertTriangle, 
  ChevronRight,
  RefreshCw,
  XCircle,
  CheckCircle2,
  FileText,
  Video
} from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { Booking, QueueEntry, DailyQueue } from '@/lib/types';
import QuestionnaireView from '@/components/telemedicine/QuestionnaireView';
import DailyRoutineDashboard from '@/components/sections/DailyRoutineDashboard';
import PrescriptionDownloader from '@/components/patient/PrescriptionDownloader';

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'routine'>('appointments');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // App state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patientPhone, setPatientPhone] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  
  // Data state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [queueSnapshot, setQueueSnapshot] = useState<any>(null);
  const [activeQueueEntries, setActiveQueueEntries] = useState<QueueEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [activeQuestionnaire, setActiveQuestionnaire] = useState<any>(null); // For Telemedicine

  const [telemedicineBookings, setTelemedicineBookings] = useState<any[]>([]);
  const [dbPatientId, setDbPatientId] = useState<string>('');

  // Check login state
  useEffect(() => {
    fetch('/api/auth/patient')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setIsLoggedIn(true);
          setPatientPhone(data.phone);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, []);

  // Fetch patient data
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/patients/data');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        setQueueSnapshot(data.queueSnapshot);
        setActiveQueueEntries(data.activeQueueEntries);
      }
      
      const resTele = await fetch('/api/telemedicine/patient');
      if (resTele.ok) {
        const teleData = await resTele.json();
        setTelemedicineBookings(teleData.appointments || []);
        if (teleData.patientId) setDbPatientId(teleData.patientId);
      }
    } catch (err) {
      console.error('Error fetching patient data:', err);
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      // Auto-poll every 10 seconds for live queue changes
      const timer = setInterval(() => fetchData(true), 10000);
      return () => clearInterval(timer);
    }
  }, [isLoggedIn, fetchData]);

  // Handle patient login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setPatientPhone(data.phone);
      setIsLoggedIn(true);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!cancellingId) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/patients/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cancellingId }),
      });
      if (res.ok) {
        setCancellingId(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      alert('Failed to cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/patient', { method: 'DELETE' });
    setIsLoggedIn(false);
    setPatientPhone('');
    setBookings([]);
    setQueueSnapshot(null);
    setActiveQueueEntries([]);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6 text-center text-white">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <h2 className="font-playfair text-xl font-bold">Verifying Portal Access</h2>
          <p className="mt-2 text-xs text-slate-400">Securing your session…</p>
        </div>
      </div>
    );
  }

  // --- LOGIN VIEW ---
  if (!isLoggedIn) {
    const benefits = [
      {
        icon: <Activity className="w-5 h-5 text-emerald-500" />,
        title: "Daily Skincare Routine",
        desc: "Track your morning and night routines, and build consistency."
      },
      {
        icon: <MessageCircle className="w-5 h-5 text-blue-500" />,
        title: "Smart Reminders",
        desc: "Get notified when it's time to apply your treatments."
      },
      {
        icon: <Calendar className="w-5 h-5 text-amber-500" />,
        title: "Live Queue Updates",
        desc: "Check your live waitlist status and book arrival windows."
      }
    ];

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Side - Benefits */}
            <div className="md:w-5/12 bg-gradient-to-br from-primary/5 to-emerald-50/50 p-8 sm:p-10 border-r border-gray-100 flex flex-col justify-center">
              <div>
                <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-6">
                  Why join your Patient Portal?
                </h3>
                
                <div className="space-y-6">
                  {benefits.map((b, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                        {b.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">{b.title}</h4>
                        <p className="text-xs font-sans text-gray-600 leading-relaxed">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-10 p-4 bg-primary/10 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-[10px] uppercase tracking-wider font-bold text-primary">100% Free for Clinic Patients</p>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="md:w-7/12 p-8 sm:p-12 flex flex-col justify-center bg-white">
              <div className="mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-lg shadow-primary/5">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Patient Portal</h2>
                <p className="text-gray-500 font-sans text-sm">Enter your mobile number to access your account.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block font-sans text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      placeholder="Enter registered mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-surface border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary text-sm font-semibold transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-sans text-xs font-bold text-gray-700 uppercase tracking-wider pl-1 flex justify-between">
                    <span>Verification Code</span>
                    <span className="text-gray-400 normal-case font-semibold">Demo: Use 1234</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      required
                      placeholder="Enter 4-digit code (1234)"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-surface border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary text-sm font-bold tracking-widest focus:placeholder:tracking-normal transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold items-center">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-4 bg-primary hover:brightness-110 text-white font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? 'Entering Portal...' : 'Access Dashboard'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Split bookings into active (confirmed, pending, arrived) and past (cancelled, completed, no-show)
  const activeBookings = bookings.filter(b => ['confirmed', 'pending', 'arrived'].includes(b.status));
  const pastBookings = bookings.filter(b => ['completed', 'cancelled', 'no-show'].includes(b.status));

  // Find active queue token for today if any
  const todayEntry = activeQueueEntries[0];  // --- DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-surface text-gray-900 pb-12 font-sans selection:bg-primary/30">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-4 sm:px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-playfair text-lg font-bold text-gray-900">Skin Hub Clinic</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Patient Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 active:scale-95 transition-all"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Welcome & Contact banner */}
        <div className="bg-gradient-to-r from-primary to-emerald-700 border border-primary/20 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden shadow-xl text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider bg-black/10 px-3 py-1.5 rounded-full border border-white/10">
              Patient Profile
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-4 font-playfair">
              Welcome back, {bookings.length > 0 ? bookings[0].name : 'Patient'}
            </h2>
            <p className="text-sm text-emerald-100 mt-2 font-medium">
              Registered Phone: +91 {patientPhone}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`https://wa.me/${siteConfig.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-black/20 hover:bg-black/30 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Assistance
              </a>
              <a
                href="/booking"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-primary hover:bg-gray-50 font-bold rounded-xl text-xs transition-all shadow-md shadow-black/10"
              >
                <Calendar className="w-4 h-4" />
                Book New Slot
              </a>
              <a
                href="/online-consultation"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                <Video className="w-4 h-4" />
                Book Online Consultation
              </a>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'appointments' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-4 h-4" /> Waitlist & Booking
            </button>
            <button
              onClick={() => setActiveTab('routine')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'routine' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-4 h-4" /> My Daily Routine
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'routine' ? (
          <DailyRoutineDashboard patient={{ id: dbPatientId || patientPhone, phone: patientPhone, name: 'Patient' }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Bookings (Col 1 & 2) */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                Active Bookings ({activeBookings.length})
              </h3>

              {activeBookings.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center text-gray-400 shadow-sm">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-sm text-gray-600">No active appointments found</p>
                  <p className="text-xs mt-1 text-gray-500">Need a checkout? Book an appointment above.</p>
                </div>
              ) : (
                activeBookings.map((b) => (
                  <div 
                    key={b.id} 
                    className="bg-white border border-gray-100 hover:border-primary/20 rounded-3xl p-5 relative overflow-hidden transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase">
                          {b.service}
                        </span>
                        <h4 className="font-playfair font-bold text-lg mt-2 text-gray-900">{b.time}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        ID: {b.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-500 mb-4 border-t border-b border-gray-100 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{b.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-primary" />
                        <span>Token Number: {b.tokenNumber || b.tokenNumber === 0 ? b.tokenNumber : 'Pending'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs">
                        {b.status === 'confirmed' && (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Confirmed</span>
                          </>
                        )}
                        {b.status === 'pending' && (
                          <>
                            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span className="text-amber-500 font-bold">Pending Review</span>
                          </>
                        )}
                        {b.status === 'arrived' && (
                          <>
                            <Activity className="w-4 h-4 text-blue-500" />
                            <span className="text-blue-500 font-bold">Checked In</span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setCancellingId(b.id)}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl active:scale-95 transition-all"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Past Bookings */}
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-8 pt-2">
                Booking History ({pastBookings.length})
              </h3>
              <div className="bg-white border border-gray-100 rounded-3xl divide-y divide-gray-100 shadow-sm overflow-hidden">
                {pastBookings.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs font-semibold">
                    No previous records found
                  </div>
                ) : (
                  pastBookings.map((b) => (
                    <div key={b.id} className="p-4 flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${b.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                          {b.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{b.service}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{b.date} at {b.time}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-600'
                          : b.status === 'cancelled'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Telemedicine Section */}
              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600 mt-8 pt-2 flex items-center gap-2">
                <Video className="w-4 h-4" /> Online Consultations ({telemedicineBookings.length})
              </h3>
              <div className="space-y-4">
                {telemedicineBookings.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center text-gray-400 shadow-sm">
                    <Video className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-sm text-gray-600">No online consultations found</p>
                  </div>
                ) : (
                  telemedicineBookings.map((tb) => (
                    <div key={tb._id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 uppercase">
                            Telemedicine
                          </span>
                          <h4 className="font-playfair font-bold text-lg mt-2 text-gray-900">{tb.preferredDate}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          tb.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          tb.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        } uppercase`}>
                          {tb.status}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-4">{tb.chiefComplaint}</p>
                      
                      {tb.status === 'confirmed' && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-3 mb-4">
                          <p className="text-xs text-blue-800 font-semibold">Your meeting is confirmed. Please complete the questionnaire before joining.</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setActiveQuestionnaire(tb)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors flex-1"
                            >
                              Fill Questionnaire
                            </button>
                            {tb.meetingUrl && (
                              <a href={tb.meetingUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white text-blue-600 hover:bg-gray-50 border border-blue-200 text-[11px] font-bold rounded-lg transition-colors flex-1 text-center">
                                Join Video Call
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {tb.prescriptionData && (
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-900 mb-1">Doctor's Prescription Available</p>
                          <PrescriptionDownloader booking={tb} prescriptionData={tb.prescriptionData} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Queue Tracker (Col 3) */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                Live Queue Status
              </h3>

              {queueSnapshot ? (
                <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="text-center pb-5 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Now Serving</p>
                    <p className="font-playfair text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500 mt-2">
                      {queueSnapshot.currentToken || '—'}
                    </p>
                    {queueSnapshot.servingPatient ? (
                      <p className="text-xs font-bold text-primary mt-2">
                        Patient Initials: {queueSnapshot.servingPatient.initials}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2">Waiting for next patient</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Wait Time</p>
                      <p className="text-base font-extrabold text-gray-900 mt-1">
                        ~{queueSnapshot.estimatedWaitMinutes} <span className="text-[10px] font-medium text-gray-500">min</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
                      <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Congestion</p>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        queueSnapshot.congestion === 'green'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : queueSnapshot.congestion === 'yellow'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {queueSnapshot.congestion}
                      </span>
                    </div>
                  </div>

                  {todayEntry && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Your Token Status</p>
                      <div className="flex justify-between items-baseline mt-2">
                        <p className="text-sm font-semibold text-gray-700">
                          Token Number: <span className="font-extrabold text-primary">#{todayEntry.tokenNumber}</span>
                        </p>
                        <span className="text-[9px] font-bold bg-white text-primary px-2 py-0.5 rounded border border-primary/20 uppercase">
                          {todayEntry.status}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] font-medium text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex gap-3">
                    <FileText className="w-5 h-5 shrink-0 text-primary" />
                    <p leading-relaxed>{queueSnapshot.message}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center text-gray-500 text-xs shadow-sm">
                  Queue status currently offline.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CANCELLATION MODAL */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-white/10 max-w-sm w-full rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <h3 className="font-playfair text-lg font-bold">Cancel Appointment?</h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Are you sure you want to cancel booking <span className="font-bold text-slate-200">{cancellingId}</span>? This action is irreversible.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                disabled={cancelLoading}
                onClick={() => setCancellingId(null)}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-650 text-slate-300 text-xs font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                No, Keep It
              </button>
              <button
                disabled={cancelLoading}
                onClick={handleCancelBooking}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-rose-600/10 disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTIONNAIRE MODAL */}
      {activeQuestionnaire && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto pt-10 pb-10 px-4">
          <div className="max-w-3xl mx-auto relative">
            <button 
              onClick={() => setActiveQuestionnaire(null)}
              className="absolute -top-10 right-0 text-white hover:text-rose-400 p-2"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <div className="rounded-[2rem] overflow-hidden">
              <QuestionnaireView 
                appointmentId={activeQuestionnaire._id} 
                patientId={dbPatientId || 'temp'} 
                onComplete={() => {
                  setActiveQuestionnaire(null);
                  fetchData();
                  alert("Questionnaire submitted successfully!");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

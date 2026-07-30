'use client';

import React, { useState, useEffect } from 'react';
import {
  Play, SkipForward, UserMinus, UserPlus, AlertCircle,
  CheckCircle2, Clock, Users, ArrowUp, ArrowDown, Star, RefreshCw,
  Search, ShieldAlert, HeartHandshake, X, ChevronLast, CheckSquare,
  Phone, User, Stethoscope, Sparkles, MessageCircle, Activity,
  TrendingUp, UserCheck, UserX, Timer, MapPin, Mail,
  FileText, Pill, StickyNote, CalendarDays, CreditCard, DollarSign
} from 'lucide-react';
import type { Booking, SlotAvailability } from '@/lib/types';
import { todayISO } from '@/lib/slots';

interface QueueControlsProps {
  todayBookings: Booking[];   // All of today's bookings from /api/appointments
  onUpdate: () => void;
  role: 'doctor' | 'staff';
}

// Booking statuses that mean "still waiting / active in queue"
const WAITING_STATUSES = ['confirmed', 'booked', 'checked-in', 'arrived'];
const SERVING_STATUSES = ['arrived'];           // Currently being served
const DONE_STATUSES = ['completed'];
const SKIPPED_STATUSES = ['no-show', 'cancelled'];

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }
  return 0;
}

export default function QueueControls({ todayBookings, onUpdate, role }: QueueControlsProps) {
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [error, setError] = useState('');

  // ── Walk-in Modal ──
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinResult, setWalkinResult] = useState<{ token: number; waUrl: string; name: string } | null>(null);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [walkinError, setWalkinError] = useState('');
  const [servicesList, setServicesList] = useState<string[]>([]);

  // Walk-in form fields (full booking schema)
  const [wName, setWName] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wEmail, setWEmail] = useState('');
  const [wService, setWService] = useState('General Consultation');
  const [wGender, setWGender] = useState('Male');
  const [wAge, setWAge] = useState('');
  const [wAddress, setWAddress] = useState('');
  const [wSkinType, setWSkinType] = useState('Normal');
  const [wProblem, setWProblem] = useState('');
  const [wMedication, setWMedication] = useState('');
  const [wNotes, setWNotes] = useState('');

  // ── Follow-up ──
  const [followUpBookingId, setFollowUpBookingId] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');

  // Walk-in Slots & Payment states
  const [wTime, setWTime] = useState('');
  const [wSlots, setWSlots] = useState<SlotAvailability[]>([]);
  const [wLoadingSlots, setWLoadingSlots] = useState(false);
  const [wFullyBooked, setWFullyBooked] = useState(false);
  const [wBookingClosed, setWBookingClosed] = useState(false);
  const [wPaymentMethod, setWPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [qPaymentPromptBooking, setQPaymentPromptBooking] = useState<Booking | null>(null);
  const [startServingPromptBooking, setStartServingPromptBooking] = useState<Booking | null>(null);

  const fetchWalkinSlots = () => {
    setWLoadingSlots(true);
    const today = todayISO();
    fetch(`/api/appointments/slots?date=${today}&type=offline`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.slots) {
          setWSlots(data.slots);
          setWFullyBooked(data.fullyBooked);
          setWBookingClosed(data.bookingClosed);
          const firstAvail = data.slots.find((s: SlotAvailability) => s.status === 'available');
          if (firstAvail) setWTime(firstAvail.time);
        }
      })
      .catch(console.error)
      .finally(() => setWLoadingSlots(false));
  };

  useEffect(() => {
    if (showWalkinModal) {
      fetchWalkinSlots();
    }
  }, [showWalkinModal]);

  // ── OPD Check-in Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [searching, setSearching] = useState(false);

  const isDoctor = role === 'doctor';

  // Load services list
  useEffect(() => {
    fetch('/api/cms')
      .then(r => r.ok ? r.json() : null)
      .then(cms => {
        const svcs: string[] = (cms?.services || []).map((s: any) => s.name);
        if (svcs.length > 0) {
          setServicesList(svcs);
          setWService(svcs[0]);
        } else {
          setServicesList(['General Consultation', 'Acne Care', 'Laser Treatment', 'Skin Lightening', 'Hair Loss', 'Anti-Aging']);
        }
      })
      .catch(() => setServicesList(['General Consultation', 'Acne Care', 'Laser Treatment']));
  }, []);

  // ── Categorize bookings ──
  // Sort strictly by slot time
  const sortBookings = (list: Booking[]) =>
    [...list].sort((a, b) => {
      const timeA = parseTimeToMinutes(a.time || '');
      const timeB = parseTimeToMinutes(b.time || '');
      if (timeA !== timeB) return timeA - timeB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  const waitingBookings = sortBookings(
    todayBookings.filter(b => WAITING_STATUSES.includes(b.status as string) && !SERVING_STATUSES.includes(b.status as string))
  );
  const servingBooking = todayBookings.find(b => SERVING_STATUSES.includes(b.status as string));
  const doneBookings = sortBookings(todayBookings.filter(b => DONE_STATUSES.includes(b.status as string)));
  const skippedBookings = sortBookings(todayBookings.filter(b => SKIPPED_STATUSES.includes(b.status as string)));
  const totalToday = todayBookings.length;

  // ── Estimated wait (15 min per patient) ──
  const estWaitMinutes = waitingBookings.length * 15;

  // ── Booking action via /api/appointments/update ──
  const bookingAction = async (id: string, action: string, extra?: Record<string, string>) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/appointments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      onUpdate();
      return data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOnlinePayment = async (bkId: string, bkName: string, bkPhone: string, action: string, extra?: Record<string, string>) => {
    setLoading(true);
    setError('');
    try {
      const payRes = await fetch('/api/appointments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: bkId }),
      });

      if (!payRes.ok) {
        throw new Error('Payment gateway order creation failed');
      }

      const payData = await payRes.json();

      if (payData.isMock) {
        const verifyRes = await fetch('/api/appointments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: payData.orderId,
            razorpay_payment_id: 'mock_payment',
            razorpay_signature: 'mock_signature',
            bookingId: bkId,
            isMock: true,
          }),
        });
        if (!verifyRes.ok) throw new Error('Mock payment verification failed');
      } else {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error('Failed to load payment checkout script');

        await new Promise((resolve, reject) => {
          const options = {
            key: payData.keyId,
            amount: payData.amount,
            currency: payData.currency,
            name: 'Skin Hub Clinic',
            description: `OPD Consultation - ${bkName}`,
            order_id: payData.orderId,
            handler: async (response: any) => {
              try {
                const verifyRes = await fetch('/api/appointments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    bookingId: bkId,
                  }),
                });
                if (!verifyRes.ok) throw new Error('Verification failed');
                resolve(true);
              } catch (err) {
                reject(err);
              }
            },
            prefill: {
              name: bkName,
              contact: bkPhone,
            },
            theme: {
              color: '#1B4F72',
            },
            modal: {
              ondismiss: () => {
                reject(new Error('Payment cancelled'));
              }
            }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        });
      }

      await bookingAction(bkId, action, { paymentMethod: 'online', ...extra });
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Skip patient (no-show) — skip to end means re-add at end by resetting status ──
  const handleSkip = async (booking: Booking) => {
    await bookingAction(booking.id, 'skip');
    setActionMsg(`${booking.name} ko skip kar diya gaya.`);
    setTimeout(() => setActionMsg(''), 3000);
  };

  // ── Mark as serving ──
  const handleStartServing = async (booking: Booking) => {
    if (booking.paymentStatus === 'paid') {
      await bookingAction(booking.id, 'start-serving');
    } else {
      setStartServingPromptBooking(booking);
    }
  };

  // ── Complete consultation ──
  const handleComplete = async (bookingId: string, followUp?: string) => {
    await bookingAction(bookingId, 'complete', followUp ? { nextScheduleDate: followUp } : undefined);
    setFollowUpBookingId(null);
    setFollowUpDate('');
    setActionMsg('Consultation complete!');
    setTimeout(() => setActionMsg(''), 3000);
  };

  // ── Send back to waiting ──
  const handleSendBack = async (booking: Booking) => {
    await bookingAction(booking.id, 'mark-waiting');
  };

  // ── OPD check-in search ──
  const searchBookings = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const all: Booking[] = await res.json();
        const todayStr = new Date().toISOString().split('T')[0];
        const q = searchQuery.toLowerCase();
        setSearchResults(
          all.filter(b =>
            b.date === todayStr &&
            ['confirmed', 'booked'].includes(b.status as string) &&
            !todayBookings.some(t => t.id === b.id && SERVING_STATUSES.includes(t.status as string)) &&
            (b.name.toLowerCase().includes(q) || b.phone.includes(q) || b.id.toLowerCase().includes(q))
          )
        );
      }
    } catch (err) { console.error(err); }
    finally { setSearching(false); }
  };

  const handleCheckIn = async (booking: Booking) => {
    if (booking.paymentStatus === 'paid') {
      await bookingAction(booking.id, 'checked-in');
      setSearchResults(prev => prev.filter(b => b.id !== booking.id));
      setSearchQuery('');
    } else {
      setQPaymentPromptBooking(booking);
    }
  };

  // ── Walk-in submit ──
  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wTime) {
      setWalkinError('Please select an available time slot.');
      return;
    }
    setWalkinLoading(true);
    setWalkinError('');
    setWalkinResult(null);
    try {
      let payload: any = {
        name: wName, phone: wPhone, email: wEmail,
        service: wService, gender: wGender, age: wAge,
        address: wAddress, skinType: wSkinType,
        problemDescription: wProblem,
        previousMedication: wMedication,
        appointmentNotes: wNotes,
        time: wTime,
        paymentMethod: wPaymentMethod,
      };

      if (wPaymentMethod === 'online') {
        const payRes = await fetch('/api/appointments/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt: 'walkin_temp_' + Date.now() }),
        });

        if (!payRes.ok) {
          throw new Error('Payment gateway order creation failed');
        }

        const payData = await payRes.json();

        if (payData.isMock) {
          payload.razorpay_order_id = payData.orderId;
          payload.razorpay_payment_id = 'mock_payment';
          payload.razorpay_signature = 'mock_signature';
        } else {
          const loaded = await loadRazorpayScript();
          if (!loaded) throw new Error('Failed to load payment checkout script');

          const rzResult = await new Promise<any>((resolve, reject) => {
            const options = {
              key: payData.keyId,
              amount: payData.amount,
              currency: payData.currency,
              name: 'Skin Hub Clinic',
              description: `Walk-in Consultation - ${wName}`,
              order_id: payData.orderId,
              handler: (response: any) => {
                resolve(response);
              },
              prefill: {
                name: wName,
                contact: wPhone,
              },
              theme: {
                color: '#1B4F72',
              },
              modal: {
                ondismiss: () => {
                  reject(new Error('Payment cancelled'));
                }
              }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          });

          payload.razorpay_order_id = rzResult.razorpay_order_id;
          payload.razorpay_payment_id = rzResult.razorpay_payment_id;
          payload.razorpay_signature = rzResult.razorpay_signature;
        }
      }

      const res = await fetch('/api/queue/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setWalkinResult({ token: data.tokenNumber, waUrl: data.whatsappUrl, name: wName });
      resetWalkinForm();
      fetchWalkinSlots(); // refresh slots list after booking
      onUpdate();
    } catch (err: any) {
      setWalkinError(err.message);
    } finally {
      setWalkinLoading(false);
    }
  };

  const resetWalkinForm = () => {
    setWName(''); setWPhone(''); setWEmail('');
    setWService(servicesList[0] || 'General Consultation');
    setWGender('Male'); setWAge(''); setWAddress('');
    setWSkinType('Normal'); setWProblem(''); setWMedication(''); setWNotes('');
    setWTime(''); setWPaymentMethod('cash');
  };

  const closeWalkinModal = () => {
    setShowWalkinModal(false);
    setWalkinResult(null);
    setWalkinError('');
    resetWalkinForm();
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 select-text text-left font-sans">

      {/* ════════════════════════════════════════
          WALK-IN REGISTRATION MODAL
      ════════════════════════════════════════ */}
      {showWalkinModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(11,27,41,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={closeWalkinModal}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0B1B29] via-[#1B4F72] to-[#2FA88A] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-playfair text-base font-black text-white">Walk-in Patient Registration</h3>
                  <p className="text-[10px] text-emerald-200 font-semibold">Complete intake form — Instant token issuance</p>
                </div>
              </div>
              <button onClick={closeWalkinModal} className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
              {/* Success */}
              {walkinResult && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">Registration Successful!</p>
                  <p className="text-2xl font-black text-emerald-900">Walk-in Added to Queue</p>
                  <p className="text-sm font-bold text-emerald-700">{walkinResult.name}</p>
                  <a href={walkinResult.waUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all">
                    <MessageCircle className="w-4 h-4" /> Send WhatsApp to Patient
                  </a>
                  <div className="pt-2 border-t border-emerald-200">
                    <button onClick={() => setWalkinResult(null)} className="text-xs font-bold text-emerald-600 underline cursor-pointer">
                      Register Another Patient
                    </button>
                  </div>
                </div>
              )}

              {!walkinResult && (
                <form onSubmit={handleWalkinSubmit} className="space-y-5">
                  {/* Name + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <User className="w-3 h-3 text-primary" /> Full Name *
                      </label>
                      <input required value={wName} onChange={e => setWName(e.target.value)} placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-primary outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> Phone / WhatsApp *
                      </label>
                      <input required type="tel" value={wPhone} onChange={e => setWPhone(e.target.value)} placeholder="+91 9876543210"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>

                  {/* Email + Service */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Mail className="w-3 h-3 text-blue-500" /> Email Address
                      </label>
                      <input type="email" value={wEmail} onChange={e => setWEmail(e.target.value)} placeholder="patient@email.com"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-blue-400 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-teal-600" /> Concern / Treatment *
                      </label>
                      <select value={wService} onChange={e => setWService(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white focus:border-teal-500 outline-none transition-all">
                        {servicesList.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Age + Gender + Skin Type */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Age *</label>
                      <input required type="number" min="1" max="120" value={wAge} onChange={e => setWAge(e.target.value)} placeholder="25"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-primary outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gender *</label>
                      <select value={wGender} onChange={e => setWGender(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white outline-none">
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    {/* <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Skin Type</label>
                      <select value={wSkinType} onChange={e => setWSkinType(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-white outline-none">
                        <option>Normal</option><option>Dry</option><option>Oily</option><option>Combination</option><option>Sensitive</option>
                      </select>
                    </div> */}
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" /> Address *
                    </label>
                    <input required value={wAddress} onChange={e => setWAddress(e.target.value)} placeholder="Street address, City, Pincode"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-rose-400 outline-none transition-all" />
                  </div>

                  {/* Problem + Medication */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <FileText className="w-3 h-3 text-indigo-500" /> Problem Description *
                      </label>
                      <textarea required rows={3} value={wProblem} onChange={e => setWProblem(e.target.value)}
                        placeholder="Symptoms, skin condition, duration..."
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-indigo-400 outline-none transition-all resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Pill className="w-3 h-3 text-amber-500" /> Previous Medication
                      </label>
                      <textarea rows={3} value={wMedication} onChange={e => setWMedication(e.target.value)}
                        placeholder="Past treatments, ointments, steroids..."
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-amber-400 outline-none transition-all resize-none" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <StickyNote className="w-3 h-3 text-teal-500" /> Appointment Notes
                    </label>
                    <textarea rows={2} value={wNotes} onChange={e => setWNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50/50 focus:bg-white focus:border-teal-400 outline-none transition-all resize-none" />
                  </div>

                  {/* Time slot picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> Select Time Slot *
                    </label>
                    {wLoadingSlots ? (
                      <p className="text-xs font-bold text-gray-500 animate-pulse">Loading slots...</p>
                    ) : wFullyBooked ? (
                      <p className="text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                        Fully booked for today.
                      </p>
                    ) : wBookingClosed ? (
                      <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        Booking closed for today.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border rounded-xl bg-gray-50/30">
                        {wSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={slot.status !== 'available'}
                            onClick={() => setWTime(slot.time)}
                            className={`py-2 px-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${slot.status !== 'available'
                              ? 'bg-gray-150 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                              : wTime === slot.time
                                ? 'bg-primary text-white border-primary ring-2 ring-primary/20'
                                : 'bg-white text-gray-800 border-gray-300 hover:border-primary'
                              }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-purple-500" /> Payment Method *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setWPaymentMethod('cash')}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${wPaymentMethod === 'cash'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        Cash Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => setWPaymentMethod('online')}
                        className={`py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${wPaymentMethod === 'online'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Online / UPI
                      </button>
                    </div>
                  </div>

                  {walkinError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />{walkinError}
                    </div>
                  )}

                  <button type="submit" disabled={walkinLoading}
                    className="w-full py-4 bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer outline-none">
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    {walkinLoading ? 'Registering...' : 'Register Walk-in Patient'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Check-in Payment Prompt Modal ── */}
      {qPaymentPromptBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setQPaymentPromptBooking(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 border border-gray-100 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">Collect Consultation Payment</p>
                <p className="text-[11px] text-gray-500 font-semibold">{qPaymentPromptBooking.name} — Unpaid Booking</p>
              </div>
            </div>

            <p className="text-xs text-gray-650 font-semibold bg-purple-50 border border-purple-100 rounded-xl p-3 leading-relaxed">
              Checked-in ke pehle fees collect karein. Payment method select karein:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  const bk = qPaymentPromptBooking;
                  setQPaymentPromptBooking(null);
                  await bookingAction(bk.id, 'checked-in', { paymentMethod: 'cash' });
                  setSearchResults(prev => prev.filter(b => b.id !== bk.id));
                  setSearchQuery('');
                }}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-emerald-250 bg-emerald-50 text-emerald-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-100 transition-all outline-none"
              >
                Cash Payment
              </button>
              <button
                type="button"
                onClick={async () => {
                  const bk = qPaymentPromptBooking;
                  setQPaymentPromptBooking(null);
                  await handleOnlinePayment(bk.id, bk.name, bk.phone, 'checked-in');
                  setSearchResults(prev => prev.filter(b => b.id !== bk.id));
                  setSearchQuery('');
                }}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-blue-250 bg-blue-50 text-blue-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-all outline-none"
              >
                Online / UPI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Start Serving Payment Prompt Modal ── */}
      {startServingPromptBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setStartServingPromptBooking(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5 border border-gray-100 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">Collect Consultation Payment</p>
                <p className="text-[11px] text-gray-500 font-semibold">{startServingPromptBooking.name} — Unpaid Booking</p>
              </div>
            </div>

            <p className="text-xs text-gray-650 font-semibold bg-purple-50 border border-purple-100 rounded-xl p-3 leading-relaxed">
              Start Serving karne ke pehle fees collect karein. Payment method select karein:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  const bk = startServingPromptBooking;
                  setStartServingPromptBooking(null);
                  await bookingAction(bk.id, 'start-serving', { paymentMethod: 'cash' });
                }}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-emerald-250 bg-emerald-50 text-emerald-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-100 transition-all outline-none"
              >
                Cash Payment
              </button>
              <button
                type="button"
                onClick={async () => {
                  const bk = startServingPromptBooking;
                  setStartServingPromptBooking(null);
                  await handleOnlinePayment(bk.id, bk.name, bk.phone, 'start-serving');
                }}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-blue-250 bg-blue-50 text-blue-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-all outline-none"
              >
                Online / UPI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          STATS HEADER
      ════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#0B1B29] to-[#1B4F72] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">

        <div className="absolute top-5 right-5 flex items-center gap-2">
          <button onClick={onUpdate} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[9px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-full">
            🟢 Live
          </span>
        </div>

        <span className="text-[10px] uppercase font-black tracking-widest text-[#2FA88A]">Currently Serving</span>
        <h3 className="text-4xl font-black mt-1.5 tracking-tight truncate">
          {servingBooking ? servingBooking.name : '—'}
        </h3>
        {servingBooking ? (
          <p className="text-sm font-bold mt-2 text-teal-300 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {servingBooking.service}
          </p>
        ) : (
          <p className="text-sm text-white/40 font-semibold mt-2">No patient currently being served</p>
        )}

        {/* 4-stat row */}
        <div className="grid grid-cols-4 gap-3 mt-6 border-t border-white/10 pt-5">
          <div className="bg-white/8 rounded-2xl p-3 text-center space-y-1">
            <Users className="w-4 h-4 text-blue-300 mx-auto" />
            <span className="text-[9px] font-bold text-blue-200 uppercase tracking-wide block">Waiting</span>
            <span className="text-2xl font-black text-white">{waitingBookings.length}</span>
          </div>
          <div className="bg-white/8 rounded-2xl p-3 text-center space-y-1">
            <Timer className="w-4 h-4 text-amber-300 mx-auto" />
            <span className="text-[9px] font-bold text-amber-200 uppercase tracking-wide block">Est. Wait</span>
            <span className="text-2xl font-black text-white">~{estWaitMinutes}m</span>
          </div>
          <div className="bg-white/8 rounded-2xl p-3 text-center space-y-1">
            <UserCheck className="w-4 h-4 text-emerald-300 mx-auto" />
            <span className="text-[9px] font-bold text-emerald-200 uppercase tracking-wide block">Done</span>
            <span className="text-2xl font-black text-emerald-300">{doneBookings.length}</span>
          </div>
          <div className="bg-white/8 rounded-2xl p-3 text-center space-y-1">
            <UserX className="w-4 h-4 text-rose-300 mx-auto" />
            <span className="text-[9px] font-bold text-rose-200 uppercase tracking-wide block">Skipped</span>
            <span className="text-2xl font-black text-rose-300">{skippedBookings.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        {totalToday > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase tracking-wider">
              <span>Daily Progress</span>
              <span>{doneBookings.length} / {totalToday} Patients</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.round((doneBookings.length / totalToday) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Banners */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {actionMsg && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />{actionMsg}
        </div>
      )}

      {/* ════════════════════════════════════════
          MAIN LAYOUT
      ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* ──── LEFT COLUMN ──── */}
        <div className="md:col-span-8 space-y-6">

          {/* Doctor Controls */}
          {isDoctor && (
            <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="font-bold text-sm text-gray-900 border-b pb-2 flex items-center gap-2 uppercase tracking-wide">
                <HeartHandshake className="w-4 h-4 text-primary" /> Doctor Control Board
              </h4>

              <div className="flex flex-wrap gap-2.5">
                {/* Call Next = start serving the first waiting patient */}
                <button
                  onClick={() => waitingBookings[0] && handleStartServing(waitingBookings[0])}
                  disabled={loading || waitingBookings.length === 0}
                  className="flex-1 min-w-[120px] py-3 bg-[#1B4F72] hover:brightness-110 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-40"
                >
                  <SkipForward className="w-4 h-4" /> Call Next
                </button>

                {servingBooking && (
                  <button
                    onClick={() => setFollowUpBookingId(servingBooking.id)}
                    className="flex-1 min-w-[120px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CheckSquare className="w-4 h-4" /> Complete
                  </button>
                )}

                {servingBooking && (
                  <button
                    onClick={() => handleSendBack(servingBooking)}
                    className="flex-1 min-w-[120px] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" /> Send Back
                  </button>
                )}

                {servingBooking && (
                  <button
                    onClick={() => handleSkip(servingBooking)}
                    className="flex-1 min-w-[120px] py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <ChevronLast className="w-4 h-4" /> Skip Patient
                  </button>
                )}
              </div>

              {/* Follow-up date */}
              {followUpBookingId && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <label className="block text-[10px] font-black text-gray-800 uppercase tracking-widest">Follow-up Date (Optional)</label>
                  <div className="flex gap-2">
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={followUpDate}
                      onChange={e => setFollowUpDate(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg font-semibold text-xs outline-none bg-white" />
                    <button onClick={() => handleComplete(followUpBookingId, followUpDate)}
                      className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer">
                      Complete
                    </button>
                    <button onClick={() => setFollowUpBookingId(null)}
                      className="px-3 py-2 border text-gray-600 rounded-lg text-[10px] font-bold cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──── LOBBY: WAITING LIST ──── */}
          <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <Users className="w-4 h-4 text-primary" />
                Lobby — Waiting Queue
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full">{waitingBookings.length}</span>
              </h4>
              <button onClick={onUpdate} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Currently Serving */}
            {servingBooking && (
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm animate-pulse">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-teal-900">{servingBooking.name}</p>
                    <p className="text-[10px] text-teal-600 font-semibold">
                      🩺 {servingBooking.service} • {servingBooking.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-teal-100 border border-teal-300 text-teal-800 text-[9px] font-black uppercase rounded-full animate-pulse">
                    Now Serving
                  </span>
                  {/* Staff can also complete from lobby */}
                  {!isDoctor && (
                    <button onClick={() => bookingAction(servingBooking.id, 'complete')}
                      className="px-2.5 py-1 bg-emerald-600 text-white text-[9px] font-bold rounded-lg cursor-pointer">
                      ✓ Done
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Waiting list — only WAITING patients, not done/skipped */}
            {waitingBookings.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Users className="w-10 h-10 text-gray-200 mx-auto" />
                <p className="text-xs text-gray-400 font-semibold">No patients in lobby</p>
                <p className="text-[10px] text-gray-300">Confirmed bookings for today will appear here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {waitingBookings.map((b, index) => (
                  <div key={b.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50/60 border-gray-100 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${b.source === 'online' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {b.source === 'online' ? '🌐 Online' : '🚶 Walk-in'}
                          </span>
                          {index === 0 && <span className="text-[9px] font-black text-blue-600 uppercase">↑ Next</span>}
                        </div>
                        <p className="font-bold text-gray-900 text-sm mt-0.5 truncate">{b.name}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">
                          {b.phone} • Slot: {b.time} • {b.service}
                        </p>
                      </div>
                    </div>

                    {/* Per-row actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isDoctor && (
                        <button onClick={() => bookingAction(b.id, 'emergency')}
                          className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer outline-none" title="Emergency">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Staff: mark as serving */}
                      {!isDoctor && (
                        <button onClick={() => handleStartServing(b)}
                          className="p-1.5 hover:bg-teal-50 text-teal-500 hover:text-teal-700 rounded-lg cursor-pointer outline-none" title="Start Serving">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleSkip(b)}
                        className="p-1.5 hover:bg-amber-50 text-amber-400 hover:text-amber-600 rounded-lg cursor-pointer outline-none" title="Skip">
                        <ChevronLast className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => bookingAction(b.id, 'cancel')}
                        className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg cursor-pointer outline-none" title="Cancel">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ──── DONE + SKIPPED sections ──── */}
          {(doneBookings.length > 0 || skippedBookings.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {doneBookings.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h5 className="text-xs font-black text-emerald-800 uppercase tracking-wide">Done ({doneBookings.length})</h5>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {doneBookings.map(b => (
                      <div key={b.id} className="flex flex-col gap-1 text-[11px] bg-white border border-emerald-100 p-2.5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 truncate max-w-[120px]">{b.name}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </div>
                        <p className="text-[10px] text-gray-500 font-semibold">{b.phone}</p>
                        <div className="flex items-center justify-between mt-1 text-[9px] font-black uppercase text-teal-650">
                          <span>⏱ {b.time}</span>
                          <span className="truncate max-w-[120px] text-right">🩺 {b.service}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skippedBookings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                    <UserX className="w-4 h-4 text-amber-600" />
                    <h5 className="text-xs font-black text-amber-800 uppercase tracking-wide">Skipped ({skippedBookings.length})</h5>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {skippedBookings.map(b => (
                      <div key={b.id} className="flex flex-col gap-1 text-[11px] bg-white border border-amber-100 p-2.5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 truncate max-w-[120px]">{b.name}</span>
                          <span className="text-amber-550 font-black text-[9px] uppercase shrink-0">No-Show</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-semibold">{b.phone}</p>
                        <div className="flex items-center justify-between mt-1 text-[9px] font-black uppercase text-amber-650">
                          <span>⏱ {b.time}</span>
                          <span className="truncate max-w-[120px] text-right">🩺 {b.service}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ──── RIGHT COLUMN ──── */}
        <div className="md:col-span-4 space-y-5">

          {/* Walk-in Register Button */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 border-b pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-playfair font-bold text-sm text-gray-900">Walk-in Registry</h4>
                <p className="text-[10px] text-gray-500 font-semibold">Full intake form + instant token</p>
              </div>
            </div>
            <button onClick={() => setShowWalkinModal(true)}
              className="w-full py-3.5 bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer outline-none">
              <UserPlus className="w-4 h-4 text-emerald-300" />
              Register Walk-in Patient
            </button>
          </div>

          {/* OPD Arrival Check-in (Staff only) */}
          {!isDoctor && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-playfair font-bold text-sm text-gray-900">OPD Arrival Check-in</h4>
                  <p className="text-[10px] text-gray-500 font-semibold">Mark pre-booked patient as arrived</p>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <input type="text" placeholder="Name, phone or booking ID..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchBookings()}
                    className="flex-1 px-3 py-2 border rounded-xl font-semibold outline-none bg-gray-50/50 focus:bg-white focus:border-purple-400 transition-all" />
                  <button onClick={searchBookings} disabled={searching}
                    className="px-3.5 py-2 bg-[#1B4F72] text-white font-bold rounded-xl cursor-pointer text-[10px] uppercase tracking-wider outline-none disabled:opacity-50">
                    {searching ? '...' : 'Find'}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto border-t border-gray-100 pt-2">
                    {searchResults.map(b => (
                      <div key={b.id} className="p-2.5 border rounded-xl bg-gray-50/80 flex items-center justify-between text-[11px]">
                        <div>
                          <p className="font-bold text-gray-900">{b.name}</p>
                          <p className="text-[9px] text-gray-500">{b.time} • {b.id}</p>
                        </div>
                        <button onClick={() => handleCheckIn(b)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[9px] uppercase cursor-pointer">
                          Check In
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Today's bookings summary */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 border-b pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-playfair font-bold text-sm text-gray-900">Today's Bookings</h4>
                <p className="text-[10px] text-gray-500 font-semibold">All scheduled for today</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-blue-50 border border-blue-100 rounded-xl py-2">
                <p className="text-xs font-black text-blue-800">{todayBookings.filter(b => b.source === 'online').length}</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase">Online</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl py-2">
                <p className="text-xs font-black text-gray-800">{todayBookings.filter(b => b.source === 'walk-in').length}</p>
                <p className="text-[9px] font-bold text-gray-500 uppercase">Walk-in</p>
              </div>
            </div>
          </div>

          {/* Staff restricted notice */}
          {!isDoctor && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-rose-900 uppercase tracking-wider leading-relaxed">
                Settings & CMS are restricted to Doctor credentials only.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

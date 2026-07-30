'use client';

import React, { useState } from 'react';
import type { Booking, PaymentStatus, BookingStatus } from '@/lib/types';
import { 
  CheckCircle2, XCircle, UserCheck, UserX, Search, Filter, 
  Calendar, Phone, CreditCard, ChevronDown, CheckSquare, Clock, FileText, RefreshCw, MessageCircle, Video 
} from 'lucide-react';

interface AppointmentsListProps {
  bookings: Booking[]; // Pass allBookings here to allow full searching & filtering
  loading: boolean;
  onAction: (
    id: string,
    action: string,
    nextScheduleDate?: string,
    rescheduleDate?: string,
    rescheduleTime?: string,
    rescheduleReason?: string,
    paymentMethod?: string
  ) => Promise<{ whatsappUrl?: string } | void> | void;
  onRefresh: () => void;
}

type FilterType = 'all' | 'online' | 'offline' | 'paid' | 'pending' | 'today' | 'upcoming' | 'cancelled' | 'completed' | 'approval';

export default function AppointmentsList({
  bookings,
  loading,
  onAction,
  onRefresh,
}: AppointmentsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('approval');
  const [followUpDates, setFollowUpDates] = useState<Record<string, string>>({});
  const [showFollowUpInput, setShowFollowUpInput] = useState<Record<string, boolean>>({});

  // Reschedule panel states
  const [showRescheduleInput, setShowRescheduleInput] = useState<Record<string, boolean>>({});
  const [rescheduleDates, setRescheduleDates] = useState<Record<string, string>>({});
  const [rescheduleTimes, setRescheduleTimes] = useState<Record<string, string>>({});
  const [rescheduleReasons, setRescheduleReasons] = useState<Record<string, string>>({});

  // WhatsApp modal state
  const [whatsappModal, setWhatsappModal] = useState<{ url: string; patientName: string; action: string } | null>(null);
  const [paymentPromptBooking, setPaymentPromptBooking] = useState<Booking | null>(null);

  // Wrapper: call onAction, capture whatsappUrl if returned, show modal
  const handleActionWithWA = async (
    id: string,
    action: string,
    nextScheduleDate?: string,
    rescheduleDate?: string,
    rescheduleTime?: string,
    rescheduleReason?: string,
    patientName?: string,
    paymentMethod?: string
  ) => {
    const result = await (onAction(id, action, nextScheduleDate, rescheduleDate, rescheduleTime, rescheduleReason, paymentMethod) as Promise<{ whatsappUrl?: string } | void>);
    if (result && result.whatsappUrl) {
      setWhatsappModal({
        url: result.whatsappUrl,
        patientName: patientName || 'Patient',
        action: action === 'confirm' ? 'Confirmed' : 'Rescheduled',
      });
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

  const handleOnlinePayment = async (
    id: string,
    action: string,
    nextScheduleDate?: string,
    rescheduleDate?: string,
    rescheduleTime?: string,
    rescheduleReason?: string,
    patientName?: string,
    patientPhone?: string
  ) => {
    try {
      const payRes = await fetch('/api/appointments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: id }),
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
            bookingId: id,
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
            description: `OPD Consultation - ${patientName}`,
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
                    bookingId: id,
                  }),
                });
                if (!verifyRes.ok) throw new Error('Verification failed');
                resolve(true);
              } catch (err) {
                reject(err);
              }
            },
            prefill: {
              name: patientName,
              contact: patientPhone,
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

      await handleActionWithWA(id, action, nextScheduleDate, rescheduleDate, rescheduleTime, rescheduleReason, patientName, 'online');
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Apply filters and searches
  const filteredBookings = bookings.filter((bk) => {
    // 1. Search Query Match
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchName = bk.name?.toLowerCase().includes(query);
      const matchPhone = bk.phone?.includes(query);
      const matchId = bk.id?.toLowerCase().includes(query);
      const matchDate = bk.date?.includes(query);
      const matchOrderId = bk.razorpayOrderId?.toLowerCase().includes(query);
      const matchPaymentId = bk.razorpayPaymentId?.toLowerCase().includes(query);
      const matchPaymentStatus = bk.paymentStatus?.toLowerCase().includes(query);
      if (!matchName && !matchPhone && !matchId && !matchDate && !matchOrderId && !matchPaymentId && !matchPaymentStatus) {
        return false;
      }
    }

    // 2. Tab Filter Match
    switch (activeFilter) {
      case 'approval':
        // Pending admin approval — online bookings awaiting confirmation
        return bk.status === 'pending';
      case 'today':
        return bk.date === todayStr;
      case 'upcoming':
        return bk.date > todayStr && bk.status !== 'cancelled' && bk.status !== 'completed';
      case 'online':
        return bk.bookingType === 'online' && bk.source !== 'walk-in';
      case 'offline':
        return bk.bookingType !== 'online' || bk.source === 'walk-in';
      case 'paid':
        return bk.paymentStatus === 'paid';
      case 'pending':
        return bk.paymentStatus === 'pending' || bk.paymentStatus === 'unpaid';
      case 'cancelled':
        return bk.status === 'cancelled';
      case 'completed':
        return bk.status === 'completed';
      default:
        return true;
    }
  });

  // Count pending approval bookings for badge
  const pendingApprovalCount = bookings.filter(bk => bk.status === 'pending').length;

  const getPaymentBadge = (status?: PaymentStatus) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'paid':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">Paid</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold uppercase tracking-wider">Pending</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold uppercase tracking-wider">Failed</span>;
      case 'refunded':
        return <span className="px-2 py-0.5 rounded bg-blue-150 border border-blue-300 text-blue-850 text-[10px] font-bold uppercase tracking-wider">Refunded</span>;
      case 'partial refund':
      case 'partial_refund':
        return <span className="px-2 py-0.5 rounded bg-indigo-100 border border-indigo-300 text-indigo-800 text-[10px] font-bold uppercase tracking-wider">Partial Refund</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Unpaid</span>;
    }
  };

  const getStatusBadge = (status?: BookingStatus) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">Confirmed</span>;
      case 'booked':
        return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">Booked</span>;
      case 'checked-in':
      case 'checked in':
      case 'arrived':
        return <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase">Checked In</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold uppercase">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">Cancelled</span>;
      case 'no-show':
      case 'no show':
        return <span className="px-2 py-0.5 rounded bg-gray-150 text-gray-700 border border-gray-200 text-[10px] font-bold uppercase">No Show</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">Pending</span>;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Booking ID',
      'Patient Name',
      'Phone',
      'Email',
      'Booking Date',
      'Time Slot',
      'Service',
      'Booking Status',
      'Payment Status',
      'Amount Paid (INR)',
      'Razorpay Order ID',
      'Razorpay Payment ID',
      'Paid At'
    ];

    const rows = filteredBookings.map(bk => [
      bk.id,
      `"${bk.name.replace(/"/g, '""')}"`,
      bk.phone,
      bk.email || '',
      bk.date,
      bk.time,
      `"${bk.service.replace(/"/g, '""')}"`,
      bk.status,
      bk.paymentStatus || 'Pending',
      bk.amountPaid || (bk.paymentStatus === 'Paid' ? 500 : 0),
      bk.razorpayOrderId || '',
      bk.razorpayPaymentId || '',
      bk.paidAt || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `skinhub_payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">

      {/* ── WhatsApp Notification Modal ── */}
      {whatsappModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setWhatsappModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">WhatsApp Notification Ready</p>
                <p className="text-[11px] text-gray-500 font-semibold">{whatsappModal.patientName} — Appointment {whatsappModal.action}</p>
              </div>
            </div>

            {/* Info text */}
            <p className="text-xs text-gray-600 font-semibold bg-green-50 border border-green-100 rounded-xl p-3 leading-relaxed">
              ✅ Appointment <strong>{whatsappModal.action}</strong> successfully. Ab patient ko WhatsApp message bhejna hai. "Send WhatsApp" button press karein — pre-filled message khulega.
            </p>

            {/* Action buttons */}
            <div className="flex gap-2">
              <a
                href={whatsappModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsappModal(null)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Send WhatsApp
              </a>
              <button
                onClick={() => setWhatsappModal(null)}
                className="px-4 py-3 border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Prompt Modal ── */}
      {paymentPromptBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setPaymentPromptBooking(null)}
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
                <p className="text-[11px] text-gray-500 font-semibold">{paymentPromptBooking.name} — Unpaid Booking</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 font-semibold bg-purple-50 border border-purple-100 rounded-xl p-3 leading-relaxed">
              Checked-in ke pehle fees collect karein. Payment method select karein:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={async () => {
                  const bk = paymentPromptBooking;
                  setPaymentPromptBooking(null);
                  await handleActionWithWA(bk.id, 'arrived', undefined, undefined, undefined, undefined, bk.name, 'cash');
                }}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-emerald-250 bg-emerald-50 text-emerald-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-100 transition-all outline-none"
              >
                Cash Payment
              </button>
              <button
                type="button"
                onClick={async () => {
                  const bk = paymentPromptBooking;
                  setPaymentPromptBooking(null);
                  await handleOnlinePayment(bk.id, 'arrived', undefined, undefined, undefined, undefined, bk.name, bk.phone);
                }}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-blue-250 bg-blue-50 text-blue-800 flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-all outline-none"
              >
                Online / UPI
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Title & Search bar row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h3 className="font-playfair text-lg sm:text-xl font-black text-gray-900">OPD Registrations</h3>
          <p className="text-[11px] text-gray-500 font-semibold">Triage bookings, update check-ins, and check payment status</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search ID, Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-xl text-xs font-semibold w-full sm:w-60 focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={exportToCSV}
            className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 rounded-xl px-3 py-2 hover:bg-teal-100 transition-colors cursor-pointer"
          >
            Export CSV
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-xs font-bold bg-gray-50 text-primary border rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors"
          >
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filter Tabs Panel */}
      <div className="flex flex-wrap gap-1.5 border-b pb-4">
        {/* Pending Approval tab — shown first & highlighted */}
        <button
          onClick={() => setActiveFilter('approval')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'approval'
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
          }`}
        >
          ⏳ Pending Approval
          {pendingApprovalCount > 0 && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              activeFilter === 'approval' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
            }`}>
              {pendingApprovalCount}
            </span>
          )}
        </button>

        {[
          { id: 'today', label: "Today's" },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'online', label: 'Online Consultation' },
          { id: 'offline', label: 'Offline Consultation' },
          { id: 'paid', label: 'Paid' },
          { id: 'pending', label: 'Pending Payment' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled' },
          { id: 'all', label: 'All Records' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as FilterType)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
              activeFilter === f.id
                ? 'bg-[#1B4F72] border-[#1B4F72] text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bookings List mapping */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 text-gray-500 font-semibold text-xs">
          No records matched the selected query search filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((bk) => (
            <div
              key={bk.id}
              className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-xs"
            >
              <div className="space-y-2">
                {/* Header line: status + payment badges */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getStatusBadge(bk.status)}
                    {getPaymentBadge(bk.paymentStatus)}
                    {bk.source === 'walk-in' ? (
                      <span className="px-2 py-0.5 rounded bg-gray-150 border border-gray-300 text-gray-700 text-[10px] font-bold uppercase tracking-wider">🚶 Walk-in</span>
                    ) : bk.bookingType === 'online' ? (
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider">🌐 Online Video</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-250 text-amber-800 text-[10px] font-bold uppercase tracking-wider">🏥 Clinic Visit</span>
                    )}
                  </div>
                  <span className="font-mono text-[9px] font-black text-gray-400 bg-white border px-2 py-0.5 rounded shadow-2xs">
                    {bk.id}
                  </span>
                </div>

                {/* Patient Information block */}
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-gray-900 text-sm">{bk.name}</p>
                  <p className="text-gray-600 font-semibold">
                    {bk.date} at {bk.time} • <span className="text-primary font-bold">{bk.service}</span>
                  </p>
                  <p className="text-gray-500 font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" /> {bk.phone}
                    {bk.email && ` • ${bk.email}`}
                  </p>
                  
                  {/* Intake diagnostics preview */}
                  {(bk.age || bk.gender || bk.skinType) && (
                    <p className="text-[10px] text-gray-600 font-semibold bg-white border border-gray-150 p-2 rounded-lg mt-1">
                      {bk.age && `Age: ${bk.age}`} {bk.gender && ` • Gender: ${bk.gender}`} {bk.skinType && ` • Skin: ${bk.skinType}`}
                    </p>
                  )}
                  {bk.problemDescription && (
                    <div className="bg-white border border-gray-150 p-2.5 rounded-lg text-[10px] space-y-1 text-gray-700 font-semibold leading-relaxed mt-1">
                      <p className="text-[9px] uppercase font-black tracking-widest text-primary">Problem Condition:</p>
                      <p>{bk.problemDescription}</p>
                      {bk.previousMedication && (
                        <>
                          <p className="text-[9px] uppercase font-black tracking-widest text-accent mt-2">Previous Meds:</p>
                          <p className="italic text-gray-600">{bk.previousMedication}</p>
                        </>
                      )}
                      {bk.images && bk.images.length > 0 && (
                        <div className="pt-2 flex gap-2 overflow-x-auto">
                          {bk.images.map((imgUrl, idx) => (
                            <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" className="block relative w-10 h-10 border rounded overflow-hidden shadow-2xs">
                              <img src={imgUrl} className="w-full h-full object-cover" alt="Patient Skin Concern" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {bk.appointmentNotes && (
                    <p className="text-[10px] text-gray-500 font-semibold italic bg-amber-50/50 p-2 rounded border border-amber-100 mt-1">
                      Notes: {bk.appointmentNotes}
                    </p>
                  )}
                  {bk.nextScheduleDate && (
                    <p className="text-[10px] text-teal-800 font-black uppercase tracking-wider bg-teal-50 border border-teal-150 p-2 rounded mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Next Follow-up: {bk.nextScheduleDate}
                    </p>
                  )}

                  {/* Payment Metadata section */}
                  {bk.payOnline && (
                    <div className="bg-emerald-50/20 border border-emerald-100 p-2.5 rounded-xl text-[10px] space-y-1 text-gray-700 font-semibold leading-relaxed mt-2 text-left">
                      <p className="text-[9px] uppercase font-black tracking-widest text-[#0D9488]">Pre-Payment Metadata:</p>
                      <p>Amount: <span className="font-bold text-gray-900">₹{bk.amountPaid || 500}</span></p>
                      {bk.razorpayOrderId && <p>Order ID: <span className="font-mono text-gray-500">{bk.razorpayOrderId}</span></p>}
                      {bk.razorpayPaymentId && <p>Transaction ID: <span className="font-mono text-gray-500">{bk.razorpayPaymentId}</span></p>}
                      {bk.paidAt && <p>Paid At: <span className="text-gray-500">{new Date(bk.paidAt).toLocaleString()}</span></p>}
                    </div>
                  )}

                  {/* Telemedicine Details section */}
                  {bk.bookingType === 'online' && bk.meetingLink && (
                    <div className="bg-teal-50/20 border border-teal-100 p-2.5 rounded-xl text-[10px] space-y-1 text-gray-700 font-semibold leading-relaxed mt-2 text-left">
                      <p className="text-[9px] uppercase font-black tracking-widest text-teal-700">Video Consultation Link:</p>
                      <p>Meeting URL: <a href={bk.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[#1B4F72] hover:underline font-bold">{bk.meetingLink}</a></p>
                      {bk.meetingPassword && <p>Password: <span className="font-bold text-gray-900">{bk.meetingPassword}</span></p>}
                    </div>
                  )}

                  {/* Payment Timeline Stepper */}
                  <div className="pt-3 border-t mt-2">
                    <p className="text-[8px] uppercase font-black text-gray-400 tracking-wider mb-2">Payment Timeline:</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center text-[9px] font-bold">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center text-[7px] text-white">✓</span>
                        <span className="ml-1 text-gray-750">Booked</span>
                      </div>
                      <span className="w-3 h-0.5 bg-gray-200"></span>
                      <div className="flex items-center text-[9px] font-bold">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] text-white ${
                          String(bk.paymentStatus).toLowerCase() === 'paid' ? 'bg-emerald-600' :
                          String(bk.paymentStatus).toLowerCase() === 'failed' ? 'bg-rose-500' :
                          'bg-amber-400'
                        }`}>
                          {String(bk.paymentStatus).toLowerCase() === 'paid' ? '✓' : '!'}
                        </span>
                        <span className="ml-1 text-gray-750">{bk.paymentStatus || 'Pending'}</span>
                      </div>
                      {String(bk.paymentStatus).toLowerCase() === 'refunded' && (
                        <>
                          <span className="w-3 h-0.5 bg-gray-200"></span>
                          <div className="flex items-center text-[9px] font-bold text-rose-600">
                            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 flex items-center justify-center text-[7px] text-white">↺</span>
                            <span className="ml-1">Refunded</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action row with conditional operations */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-150 mt-auto">
                
                {/* Completion follow-up scheduler sheet */}
                {showFollowUpInput[bk.id] && (
                  <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 font-sans text-xs shadow-md animate-fade-in-up">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                        Choose Follow-up Date (Dispatches Email)
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        min={todayStr}
                        value={followUpDates[bk.id] || ''}
                        onChange={(e) => setFollowUpDates({ ...followUpDates, [bk.id]: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-xl font-semibold text-xs outline-none bg-gray-50 focus:bg-white focus:border-teal-500 transition-all"
                      />
                      <button
                        onClick={() => {
                          onAction(bk.id, 'complete', followUpDates[bk.id]);
                          setShowFollowUpInput({ ...showFollowUpInput, [bk.id]: false });
                        }}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl uppercase text-[10px] tracking-wider outline-none shadow-xs transition-all cursor-pointer"
                      >
                        Complete Session
                      </button>
                    </div>
                  </div>
                )}

                {/* Reschedule scheduler sheet */}
                {showRescheduleInput[bk.id] && (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleActionWithWA(
                        bk.id, 
                        'reschedule', 
                        undefined, 
                        rescheduleDates[bk.id], 
                        rescheduleTimes[bk.id], 
                        rescheduleReasons[bk.id],
                        bk.name
                      );
                      setShowRescheduleInput({ ...showRescheduleInput, [bk.id]: false });
                    }} 
                    className="p-4 bg-white border border-gray-200 rounded-2xl space-y-3 font-sans text-xs text-left shadow-md animate-fade-in-up"
                  >
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Clock className="w-4 h-4 text-[#1B4F72]" />
                      <p className="font-black text-gray-800 uppercase text-[10px] tracking-wider">
                        Reschedule Appointment Slot
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col">
                        <label className="text-[9px] text-gray-500 font-bold mb-1">New Date</label>
                        <input
                          required
                          type="date"
                          min={todayStr}
                          value={rescheduleDates[bk.id] || ''}
                          onChange={(e) => setRescheduleDates({ ...rescheduleDates, [bk.id]: e.target.value })}
                          className="px-3 py-2 border rounded-xl font-semibold text-xs outline-none bg-gray-50 focus:bg-white focus:border-primary transition-all"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[9px] text-gray-500 font-bold mb-1">New Time Slot</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. 10:30 AM"
                          value={rescheduleTimes[bk.id] || ''}
                          onChange={(e) => setRescheduleTimes({ ...rescheduleTimes, [bk.id]: e.target.value })}
                          className="px-3 py-2 border rounded-xl font-semibold text-xs outline-none bg-gray-50 focus:bg-white focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[9px] text-gray-500 font-bold mb-1">Reason for Rescheduling</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Doctor emergency / congestion"
                        value={rescheduleReasons[bk.id] || ''}
                        onChange={(e) => setRescheduleReasons({ ...rescheduleReasons, [bk.id]: e.target.value })}
                        className="px-3 py-2 border rounded-xl font-semibold text-xs outline-none bg-gray-50 focus:bg-white focus:border-primary transition-all"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1B4F72] hover:brightness-110 text-white font-bold rounded-xl uppercase text-[10px] tracking-wider cursor-pointer shadow-xs transition-all outline-none"
                      >
                        Send Reschedule Request
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRescheduleInput({ ...showRescheduleInput, [bk.id]: false })}
                        className="px-3 py-2 border text-gray-600 hover:bg-gray-50 rounded-xl text-[10px] font-bold outline-none"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {/* Confirms/Verifies booking request */}
                  {bk.status === 'pending' && (
                    <button
                      onClick={() => handleActionWithWA(bk.id, 'confirm', undefined, undefined, undefined, undefined, bk.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Slot
                    </button>
                  )}

                  {/* Verify Payment for pending online bookings */}
                  {bk.bookingType === 'online' && bk.status === 'pending' && bk.paymentStatus === 'pending' && bk.razorpayPaymentLinkId && (
                    <button
                      onClick={async () => {
                        try {
                          const res = (await onAction(bk.id, 'verify-payment-link')) as any;
                          if (res && res.paid) {
                            alert('Payment verified as Paid! Slot has been confirmed and video consultation meeting link generated.');
                            onRefresh();
                          } else {
                            alert(`Payment link is still unpaid (Current status: ${res?.paymentLinkStatus || 'unpaid'}).`);
                          }
                        } catch (err: any) {
                          alert(err.message || 'Verification failed');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-750 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-[spin_4s_linear_infinite]" /> Verify Payment
                    </button>
                  )}

                   {/* Arrived Checked In (for offline/physical visits only) */}
                  {(bk.status === 'confirmed' || bk.status === 'booked') && bk.bookingType !== 'online' && (
                    <button
                      onClick={() => {
                        if (bk.paymentStatus === 'paid') {
                          handleActionWithWA(bk.id, 'arrived', undefined, undefined, undefined, undefined, bk.name);
                        } else {
                          setPaymentPromptBooking(bk);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Check In
                    </button>
                  )}

                  {/* Send Meeting Link (WhatsApp) for online bookings */}
                  {bk.bookingType === 'online' && bk.status === 'confirmed' && bk.paymentStatus === 'paid' && bk.meetingLink && (
                    <button
                      onClick={() => {
                        const msg = `*Skin Hub Clinic — Online Consultation Confirmed* 🏥\n\nHello ${bk.name},\n\nYour payment has been received and your slot on ${bk.date} at ${bk.time} is successfully confirmed.\n\nPlease join your video consultation using the meeting details below:\n\nMeeting Link: ${bk.meetingLink}\nPassword: ${bk.meetingPassword || '—'}\n\nPlease join 5 minutes before your scheduled slot.`;
                        const waUrl = `https://wa.me/${bk.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                        window.open(waUrl, '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <Video className="w-3.5 h-3.5" /> Send Meeting Link (WA)
                    </button>
                  )}

                  {/* Complete Consultation (prompts follow-up date option) */}
                  {(bk.status === 'checked-in' || bk.status === 'arrived' || (bk.status === 'confirmed' && bk.bookingType === 'online')) && !showFollowUpInput[bk.id] && (
                    <button
                      onClick={() => setShowFollowUpInput({ ...showFollowUpInput, [bk.id]: true })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Complete Session
                    </button>
                  )}

                  {/* Reschedule Button */}
                  {bk.status !== 'cancelled' && bk.status !== 'completed' && !showRescheduleInput[bk.id] && (
                    <button
                      onClick={() => setShowRescheduleInput({ ...showRescheduleInput, [bk.id]: true })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4F72] hover:brightness-110 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <Clock className="w-3.5 h-3.5" /> Reschedule
                    </button>
                  )}

                  {/* Cancel Booking */}
                  {bk.status !== 'cancelled' && bk.status !== 'completed' && (
                    <button
                      onClick={() => onAction(bk.id, 'cancel')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}

                  {/* Refund Button */}
                  {String(bk.paymentStatus).toLowerCase() === 'paid' && bk.status !== 'Cancelled' && bk.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to refund this payment? This will also cancel the booking.')) {
                          onAction(bk.id, 'refund');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refund
                    </button>
                  )}

                  {/* Invoice Button */}
                  {bk.payOnline && (
                    <button
                      onClick={() => window.open(`/api/appointments/invoice?id=${bk.id}`, '_blank')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-150 hover:bg-gray-200 text-gray-700 border rounded-lg text-[10px] font-black uppercase tracking-wider shadow-2xs cursor-pointer outline-none"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-500" /> Invoice
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, MessageCircle, User, Phone, Stethoscope, Sparkles, CheckCircle2, CreditCard, DollarSign, Clock } from 'lucide-react';
import { todayISO } from '@/lib/slots';
import type { SlotAvailability } from '@/lib/types';

interface WalkInFormProps {
  onRegistered: () => void;
}

export default function WalkInForm({ onRegistered }: WalkInFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('General Consultation');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ token: number; waUrl: string } | null>(null);
  const [error, setError] = useState('');

  // Slots & Payment states
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [fullyBooked, setFullyBooked] = useState(false);
  const [bookingClosed, setBookingClosed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');

  const fetchSlots = () => {
    setLoadingSlots(true);
    const today = todayISO();
    fetch(`/api/appointments/slots?date=${today}&type=offline`)
      .then(r => r.json())
      .then(data => {
        if (data.slots) {
          setSlots(data.slots);
          setFullyBooked(data.fullyBooked);
          setBookingClosed(data.bookingClosed);
          const firstAvail = data.slots.find((s: SlotAvailability) => s.status === 'available');
          if (firstAvail) setTime(firstAvail.time);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
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

  useEffect(() => {
    fetchSlots();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) {
      setError('Please select an available time slot.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let payload: any = { name, phone, service, time, paymentMethod };

      if (paymentMethod === 'online') {
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
              description: `Walk-in Consultation - ${name}`,
              order_id: payData.orderId,
              handler: (response: any) => {
                resolve(response);
              },
              prefill: {
                name,
                contact: phone,
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

      setResult({ token: data.tokenNumber, waUrl: data.whatsappUrl });
      setName('');
      setPhone('');
      fetchSlots(); // refresh slots list
      onRegistered();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Card Top Banner Accent */}
      <div className="bg-gradient-to-r from-[#0B1B29] via-[#1B4F72] to-[#2FA88A] px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-playfair text-base font-black tracking-wide text-white">Walk-in Patient Registry</h3>
            <p className="text-[10px] text-emerald-200 font-semibold">Instant Queue Entry</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-white/15 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-100 border border-white/20">
          Fast Track
        </span>
      </div>

      <div className="p-6 space-y-5">
        {result && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl text-center shadow-xs space-y-2 animate-fade-in-up">
            <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-black text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> Patient Registered Successfully
            </div>
            <p className="text-xl font-black text-emerald-900 tracking-tight">Added to Queue</p>
            <a
              href={result.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <MessageCircle className="w-4 h-4" /> Send WhatsApp Receipt to Patient
            </a>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Patient Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <User className="w-3 h-3 text-primary" /> Patient Full Name *
            </label>
            <div className="relative">
              <input
                required
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* WhatsApp Phone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp Number *
            </label>
            <div className="relative">
              <input
                required
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-teal-600" /> Requested Service
            </label>
            <div className="relative">
              <input
                placeholder="General Consultation / Acne Care / Laser"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
              <Stethoscope className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Time slot picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Select Time Slot *
            </label>
            {loadingSlots ? (
              <p className="text-xs font-bold text-gray-500 animate-pulse">Loading slots...</p>
            ) : fullyBooked ? (
              <p className="text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                Fully booked for today.
              </p>
            ) : bookingClosed ? (
              <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                Booking closed for today.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border rounded-xl bg-gray-50/30">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={slot.status !== 'available'}
                    onClick={() => setTime(slot.time)}
                    className={`py-2 px-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                      slot.status !== 'available'
                        ? 'bg-gray-150 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                        : time === slot.time
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
                onClick={() => setPaymentMethod('cash')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Cash Payment
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('online')}
                className={`py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'online'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Online / UPI
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 outline-none cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            {loading ? 'Registering...' : 'Register Walk-in Patient'}
          </button>
        </form>
      </div>
    </div>
  );
}

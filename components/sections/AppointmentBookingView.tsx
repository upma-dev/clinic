'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, ArrowRight, RefreshCw, Calendar, Sparkles, AlertCircle, Phone, User, Stethoscope, CheckCircle, List, ShieldCheck, CreditCard } from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { QueueState, SlotAvailability } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';

interface BookingResult {
  id: string;
  token?: number;
  paymentStatus?: 'paid' | 'unpaid';
}

export default function AppointmentBookingView() {
  // === QUEUE STATE ===
  const [queueData, setQueueData] = useState<QueueState>({
    currentPatient: 0,
    totalPatientsToday: 0,
    estimatedWaitTime: 0,
    status: 'green',
    message: 'Loading clinic status...',
    lastUpdated: new Date().toISOString()
  });
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [mounted, setMounted] = useState(false);

  // === BOOKING STATE ===
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState(siteConfig.services[0]?.name || 'Dermatology Consultation');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ id: string; token?: number; paymentStatus?: string } | null>(null);
  const [errorText, setErrorText] = useState('');

  // Fetch Queue & Waitlist
  const fetchQueueData = async () => {
    setLoadingQueue(true);
    try {
      // 1. Fetch Queue Status
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
        setWaitlist(data.queuePreview || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQueue(false);
    }
  };

  // Fetch Slots
  const fetchSlots = async (selectedDate: string) => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/appointments/slots?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Initial load & Polling
  useEffect(() => {
    setMounted(true);
    fetchQueueData();
    const timer = setInterval(() => {
      fetchQueueData();
      if (date) fetchSlots(date);
    }, 15000); // 15s aggressive polling for live waitlist
    return () => clearInterval(timer);
  }, [date]);

  // When date changes, fetch slots immediately
  useEffect(() => {
    fetchSlots(date);
    setTime(''); // Reset selected time
  }, [date]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingBooking(true);
    setErrorText('');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, service, date, time })
      });

      const data = await res.json();
      if (res.ok) {
        setBookingResult({ id: data.id, token: data.token, paymentStatus: 'unpaid' });
        fetchSlots(date);
      } else {
        setErrorText(data.error || 'Failed to book appointment');
      }
    } catch (err) {
      setErrorText('An error occurred. Please try again.');
    } finally {
      setLoadingBooking(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingResult) return;
    setLoadingBooking(true);
    setErrorText('');
    
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) throw new Error('Razorpay SDK failed to load.');

      const orderRes = await fetch('/api/appointments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: bookingResult.id })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok && !orderData.isMock) throw new Error(orderData.error || 'Failed to create order');

      if (orderData.isMock) {
        // Bypass Razorpay SDK and directly verify
        const verifyRes = await fetch('/api/appointments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: 'mock_payment',
            razorpay_signature: 'mock_signature',
            bookingId: bookingResult.id,
            isMock: true
          })
        });
        if (!verifyRes.ok) throw new Error('Payment verification failed');
        setBookingResult({ ...bookingResult, paymentStatus: 'paid' });
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Skin Hub Clinic',
        description: 'Consultation Fee (Skip Queue)',
        image: '/favicon.ico',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setLoadingBooking(true);
            const verifyRes = await fetch('/api/appointments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: bookingResult.id
              })
            });

            if (!verifyRes.ok) throw new Error('Payment verification failed');
            
            setBookingResult({ ...bookingResult, paymentStatus: 'paid' });
          } catch (err) {
            setErrorText('Payment verification failed.');
          } finally {
            setLoadingBooking(false);
          }
        },
        prefill: {
          name: name,
          contact: phone
        },
        theme: {
          color: '#0d9488'
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      setErrorText(err.message || 'Something went wrong.');
    } finally {
      setLoadingBooking(false);
    }
  };

  const statusColors = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    yellow: 'bg-amber-100 text-amber-800 border-amber-200',
    red: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const congestionDots = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      
      {/* LEFT COL: Live Clinic Status & Waitlist */}
      <div className="space-y-6 lg:space-y-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className={`rounded-3xl border shadow-xl p-6 sm:p-10 transition-colors duration-500 ${statusColors[queueData.status as keyof typeof statusColors] || statusColors.green}`}
        >
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative flex h-4 w-4">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${congestionDots[queueData.status as keyof typeof congestionDots]}`}></span>
                  <span className={`relative inline-flex rounded-full h-4 w-4 ${congestionDots[queueData.status as keyof typeof congestionDots]}`}></span>
                </div>
                <h3 className="font-sans font-bold text-sm uppercase tracking-widest opacity-80">Live Clinic Status</h3>
              </div>
              <h4 className="font-playfair text-3xl font-black mt-2">{queueData.message}</h4>
            </div>
            <button 
              onClick={fetchQueueData} 
              disabled={loadingQueue}
              className="p-3 bg-white/40 hover:bg-white/60 rounded-full transition-all text-gray-800 disabled:opacity-50 shadow-sm"
              aria-label="Refresh Queue"
            >
              <RefreshCw className={`w-5 h-5 ${loadingQueue ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-sm">
              <Users className="w-6 h-6 mb-3 opacity-70" />
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">Current Patient</p>
              <p className="text-4xl font-black">{queueData.currentPatient || '--'}</p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-sm">
              <Clock className="w-6 h-6 mb-3 opacity-70" />
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">Est. Wait Time</p>
              <p className="text-4xl font-black">{queueData.estimatedWaitTime}<span className="text-lg font-bold ml-1 opacity-70">mins</span></p>
            </div>
          </div>
          
          <p className="text-xs font-semibold opacity-60 mt-6 flex items-center justify-center">
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {mounted ? new Date(queueData.lastUpdated).toLocaleTimeString() : ''}
          </p>
        </motion.div>

        {/* Live Waitlist Display */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-10"
        >
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <List className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-playfair text-xl font-bold text-gray-900">Current Waitlist</h3>
              <p className="font-sans text-xs text-gray-500 font-semibold">Patients waiting at the clinic</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {waitlist.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 font-semibold text-sm">No patients waiting right now.</p>
              </div>
            ) : (
              waitlist.map((item) => (
                <div key={item.token} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-surface">
                  <div className="flex items-center gap-4">
                    <span className="font-black text-2xl text-gray-200 w-8">#{item.position}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {item.firstName}
                      </p>
                      <p className="text-[10px] font-bold text-primary font-mono">
                        Token #{item.token}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${
                    item.status === 'serving' || item.status === 'consulting' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* RIGHT COL: Booking Form */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-6 sm:p-10 relative h-full">
          
          <AnimatePresence mode="wait">
            {bookingResult ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-12 h-full"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="font-playfair text-3xl font-black text-gray-900 mb-4">Request Confirmed!</h3>
                <p className="font-sans text-gray-600 text-base leading-relaxed max-w-md mx-auto mb-6">
                  Your arrival window for <span className="font-bold text-gray-900">{date} at {time}</span> is booked.
                </p>

                {bookingResult.paymentStatus === 'paid' ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-8 flex flex-col items-center max-w-sm mx-auto">
                    <ShieldCheck className="w-6 h-6 mb-2 text-emerald-600" />
                    <p className="font-bold text-sm">Payment Successful!</p>
                    <p className="text-xs mt-1">You will be prioritized in the clinic queue.</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 p-5 rounded-2xl mb-8 flex flex-col items-center max-w-sm mx-auto w-full">
                    <CreditCard className="w-6 h-6 mb-2 text-blue-600" />
                    <p className="font-bold text-sm">Skip the Billing Queue?</p>
                    <p className="text-xs mt-1 mb-4 opacity-80">Pay your consultation fee (₹500) online now.</p>
                    <button 
                      onClick={handlePayment}
                      disabled={loadingBooking}
                      className="w-full py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                      {loadingBooking ? 'Processing...' : 'Pay ₹500 Now'}
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => { setBookingResult(null); setTime(''); }}
                  className="px-8 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Book Another Window
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleBooking} 
                className="space-y-6 flex flex-col h-full"
              >
                <div className="mb-2">
                  <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-2">Reserve Arrival Window</h3>
                  <p className="font-sans text-sm text-gray-500">Book an arrival window online. Note that consultation times are dynamic based on the live clinic queue.</p>
                </div>

                {errorText && (
                  <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl flex items-center">
                    <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                    {errorText}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        required
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        required
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                        placeholder="+91 90000 00000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Service Type</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select 
                        value={service} 
                        onChange={(e) => setService(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold appearance-none"
                      >
                        {siteConfig.services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        required
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 flex-grow">
                  <div className="flex justify-between items-center pl-1">
                    <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">Arrival Window (15 Min)</label>
                    {loadingSlots && <span className="text-[10px] font-bold text-primary flex items-center"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Loading</span>}
                  </div>
                  
                  {slots.length === 0 && !loadingSlots ? (
                    <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-8 text-center">
                      <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 font-semibold text-sm">No arrival windows available on this date.</p>
                      <p className="text-gray-400 text-xs mt-1">Please select another date or register as a walk-in.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {slots.map(slot => {
                        const isSelected = time === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={slot.status !== 'available'}
                            onClick={() => setTime(slot.time)}
                            className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                              isSelected 
                                ? 'bg-primary text-white border-primary shadow-md' 
                                : slot.status === 'available'
                                  ? 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary' 
                                  : 'bg-gray-50 text-gray-400 border-gray-100 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={loadingBooking || !time}
                    className="w-full py-4 bg-primary text-white rounded-xl font-sans font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 hover:-translate-y-0.5"
                  >
                    {loadingBooking ? 'Confirming...' : 'Reserve Arrival Window'}
                    {!loadingBooking && <ArrowRight className="w-5 h-5 ml-2" />}
                  </button>
                  <p className="text-center font-sans text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-4">
                    Please arrive 10 minutes before your booked window.
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          
        </div>
      </motion.div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, AlertCircle, CreditCard, CheckCircle, Clock, Upload, X, ShieldAlert } from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { SlotAvailability, ClinicSettings } from '@/lib/types';
import { todayISO } from '@/lib/slots';

export default function BookingForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [bookingType, setBookingType] = useState<'online' | 'offline'>('online');
  const [payOnline, setPayOnline] = useState(true);

  // Patient Intake Details
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [skinType, setSkinType] = useState('Normal');
  const [problemDescription, setProblemDescription] = useState('');
  const [previousMedication, setPreviousMedication] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  // Slots State
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [fullyBooked, setFullyBooked] = useState(false);
  const [bookingClosed, setBookingClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Payment checkout overlay modal
  const [mockPaymentModal, setMockPaymentModal] = useState<{
    show: boolean;
    appointmentId: string;
    fee: number;
    orderId: string;
    keyId: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    token?: number;
    status?: string;
    paymentStatus?: string;
  } | null>(null);
  const [errorText, setErrorText] = useState('');

  // Dynamic config parameters
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [onlineFee, setOnlineFee] = useState(200);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : null),
      fetch('/api/cms').then(r => r.ok ? r.json() : null)
    ]).then(([settingsData, cmsData]) => {
      if (settingsData) {
        setSettings(settingsData);
        setOnlineFee(settingsData.onlineConsultationFee || settingsData.consultationFee || 200);
      }
      const svcs = cmsData?.services || siteConfig.services;
      setServicesList(svcs);
      if (svcs.length > 0) {
        setService(svcs[0].name);
      }
    }).catch(console.error);
  }, []);

  const fetchSlots = () => {
    if (!date) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    // Fetch slots based on booking type
    const fetchUrl = `/api/appointments/slots?date=${date}&type=${bookingType}`;
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data.slots) {
          setSlots(data.slots);
          setFullyBooked(data.fullyBooked);
          setBookingClosed(data.bookingClosed);
          const firstAvailable = data.slots.find(
            (s: SlotAvailability) => s.status === 'available'
          );
          setTime(firstAvailable?.time || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  };

  useEffect(() => {
    fetchSlots();
  }, [date, bookingType]);

  // Razorpay dynamic loading helper
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Image upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFiles(true);

    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUploadedUrls(prev => [...prev, ...data.urls]);
      }
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Booking Flow Submit
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorText('');
    setBookingResult(null);

    if (!name || !phone || !date || !time) {
      setErrorText('Please fill in name, phone, date and select an available time slot.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          service,
          date,
          time,
          message,
          payOnline: bookingType === 'online' && payOnline,
          bookingType,
          gender,
          age,
          address,
          skinType: bookingType === 'online' ? skinType : undefined,
          problemDescription,
          previousMedication,
          images: uploadedUrls,
          appointmentNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Booking failed');
      }

      const data = await res.json();

      // If Razorpay checkout is needed
      if (data.requiresPayment) {
        const payRes = await fetch('/api/appointments/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt: data.appointmentId }),
        });

        if (!payRes.ok) {
          throw new Error('Payment gateway order creation failed');
        }

        const payData = await payRes.json();

        if (payData.isMock) {
          // Open Premium Mock payment portal modal for test simulations
          setMockPaymentModal({
            show: true,
            appointmentId: data.appointmentId,
            fee: payData.amount / 100,
            orderId: payData.orderId,
            keyId: payData.keyId,
          });
          setLoading(false);
          return;
        }

        // Live Razorpay Script Checkout
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Failed to load payment checkout script');
        }

        const options = {
          key: payData.keyId,
          amount: payData.amount,
          currency: payData.currency,
          name: settings?.clinicName || 'Skin Hub Clinic',
          description: `Consultation Booking - ${name}`,
          order_id: payData.orderId,
          handler: async (response: any) => {
            setLoading(true);
            try {
              // Poll status to wait for the webhook to update it
              let attempts = 0;
              const maxAttempts = 10;
              const checkStatus = async () => {
                const statusRes = await fetch(`/api/appointments/status?id=${data.appointmentId}`);
                if (statusRes.ok) {
                  const statusData = await statusRes.json();
                  if (statusData.paymentStatus === 'Paid') {
                    setBookingResult({
                      id: data.appointmentId,
                      token: statusData.tokenNumber,
                      status: statusData.status,
                      paymentStatus: 'Paid',
                    });
                    return true;
                  }
                }
                attempts++;
                if (attempts < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  return checkStatus();
                }
                return false;
              };

              const verified = await checkStatus();
              if (!verified) {
                // Showing fallback message if webhook was slightly delayed
                setBookingResult({
                  id: data.appointmentId,
                  status: 'Pending',
                  paymentStatus: 'Pending',
                });
                setErrorText('Payment captured! We are verifying details with the gateway. Check dashboard in a few seconds.');
              }
            } catch (err: any) {
              setErrorText(err.message || 'Payment verification failed');
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name,
            email,
            contact: phone,
          },
          theme: {
            color: '#1B4F72',
          },
          modal: {
            ondismiss: async () => {
              // Trigger failed payment webhook record
              await fetch('/api/webhook/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  isMock: true,
                  event: 'payment.failed',
                  payload: {
                    payment: {
                      entity: {
                        order_id: payData.orderId,
                        amount: payData.amount,
                      }
                    }
                  }
                }),
              });
              setErrorText('Payment cancelled. Your booking stays pending payment.');
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setLoading(false);
      } else {
        // Direct booking completion (offline or no checkout requested)
        setBookingResult({
          id: data.appointmentId,
          token: data.tokenNumber,
          status: data.status,
          paymentStatus: bookingType === 'online' ? 'Pending' : undefined,
        });
      }
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Booking failed. Please retry.');
    } finally {
      if (!mockPaymentModal) {
        setLoading(false);
      }
    }
  };

  // Mock Payment Simulator Verify Handlers
  const handleMockVerify = async (success: boolean) => {
    if (!mockPaymentModal) return;
    setLoading(true);
    const appointmentId = mockPaymentModal.appointmentId;
    const orderId = mockPaymentModal.orderId;
    const fee = mockPaymentModal.fee;
    setMockPaymentModal(null);

    try {
      // Trigger Razorpay Webhook API directly
      const webhookRes = await fetch('/api/webhook/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMock: true,
          event: success ? 'payment.captured' : 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: 'mock_pay_' + Date.now(),
                order_id: orderId,
                amount: fee * 100
              }
            }
          }
        }),
      });

      if (!webhookRes.ok) {
        throw new Error('Simulation webhook dispatch failed');
      }

      // Poll status until it matches
      let attempts = 0;
      const maxAttempts = 6;
      const checkStatus = async () => {
        const statusRes = await fetch(`/api/appointments/status?id=${appointmentId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (success && statusData.paymentStatus === 'Paid') {
            setBookingResult({
              id: appointmentId,
              token: statusData.tokenNumber,
              status: statusData.status,
              paymentStatus: 'Paid',
            });
            return true;
          } else if (!success && statusData.paymentStatus === 'Failed') {
            setErrorText('Mock Payment Failed. Booking is recorded as pending payment.');
            return true;
          }
        }
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return checkStatus();
        }
        return false;
      };

      await checkStatus();
    } catch (err: any) {
      setErrorText(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setService(servicesList[0]?.name || '');
    setTime('');
    setMessage('');
    setGender('Male');
    setAge('');
    setAddress('');
    setSkinType('Normal');
    setProblemDescription('');
    setPreviousMedication('');
    setAppointmentNotes('');
    setUploadedUrls([]);
    setBookingResult(null);
    setErrorText('');
    fetchSlots();
  };

  const minDate = new Date().toISOString().split('T')[0];

  if (settings && !settings.enableOnlineBooking) {
    return (
      <section id="bookings" className="py-20 bg-white select-text">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-300 flex items-center justify-center mx-auto text-rose-700">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-playfair text-3xl font-bold text-gray-900 tracking-tight">Online Booking Suspended</h2>
          <p className="font-sans text-gray-600 max-w-md mx-auto leading-relaxed font-semibold">
            Online appointments are temporarily disabled. Please visit the clinic directly or call our reception desk at <strong>{settings.clinicPhone}</strong>.
          </p>
        </div>
      </section>
    );
  }

  const slotDuration = settings?.onlineSlotDuration || settings?.slotDurationMinutes || 15;
  const cutoffTime = settings ? `${settings.bookingCutoffHour}:${String(settings.bookingCutoffMinute || 0).padStart(2, '0')}` : '07:30 PM';

  return (
    <section id="bookings" className="py-20 bg-white select-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Mock Payment Simulation Modal Overlay */}
        {mockPaymentModal && (
          <div className="fixed inset-0 bg-[#0B1B29]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl border border-gray-250 shadow-2xl p-6 sm:p-8 space-y-6 text-left relative animate-fade-in-up">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="font-playfair text-lg sm:text-xl font-black text-gray-950 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Razorpay Sandbox
                </h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                  DEVELOPMENT MODE
                </span>
              </div>
              <div className="space-y-3 font-sans text-xs font-semibold text-gray-700">
                <p>Appointment Ref: <span className="font-mono text-primary font-black">{mockPaymentModal.appointmentId}</span></p>
                <p>Mandatory Fee: <span className="text-sm font-bold text-gray-900">₹{mockPaymentModal.fee}</span></p>
                <p className="text-gray-500 text-[11px] leading-relaxed">
                  Your Razorpay Key credentials are not set in the active environment configs. Simulating the payment status responses triggers complete state updates in MongoDB.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => handleMockVerify(true)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs rounded-xl shadow-xs cursor-pointer text-center outline-none"
                >
                  🟢 Simulate Success (Paid)
                </button>
                <button
                  onClick={() => handleMockVerify(false)}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-sans font-bold text-xs rounded-xl shadow-xs cursor-pointer text-center outline-none"
                >
                  🔴 Simulate Failure (Pending)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-sans text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Flexible OPD Scheduler
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Book Your Consultation
          </h2>
          <p className="font-sans text-gray-800 mt-2 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-semibold">
            Choose online consultation or schedule physical clinic visit visits.
          </p>
        </div>

        {/* Dynamic type filters */}
        <div className="flex justify-center mb-8 font-sans">
          <div className="bg-surface border border-gray-200 p-1.5 rounded-2xl inline-flex space-x-2">
            <button
              onClick={() => { setBookingType('online'); setTime(''); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${bookingType === 'online' ? 'bg-[#1B4F72] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              🌐 Online Video Consultation
            </button>
            <button
              onClick={() => { setBookingType('offline'); setTime(''); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${bookingType === 'offline' ? 'bg-[#1B4F72] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              🏥 Offline Clinic Visit
            </button>
          </div>
        </div>

        {/* Main form */}
        <div className="bg-[#F8F6F2] rounded-2xl border border-gray-300 p-6 sm:p-10 shadow-xl text-left relative overflow-hidden">

          {bookingResult ? (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 border border-green-300 flex items-center justify-center mx-auto text-green-700 animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-playfair text-2.5xl font-black text-gray-900">
                Request Submitted Successfully!
              </h3>
              <p className="font-sans text-sm text-gray-600 font-semibold max-w-sm mx-auto leading-relaxed">
                Your appointment request has been submitted successfully. The clinic team will review it shortly, and you will receive a confirmation message on WhatsApp.
              </p>
              <div className="bg-white border border-gray-250 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3 font-sans text-xs font-bold text-gray-700 shadow-sm leading-relaxed">
                <p>Reference: <span className="font-mono text-primary font-black">{bookingResult.id}</span></p>
                <p>Scheduled: {date} at {time}</p>
                <p>Treatment: {service}</p>
                {bookingResult.paymentStatus && (
                  <p>Payment Status: <span className="text-emerald-600 font-bold uppercase">{bookingResult.paymentStatus}</span></p>
                )}
                <p>Type: <span className="text-primary font-bold uppercase">{bookingType === 'online' ? 'Online Video' : 'Offline OPD Visit'}</span></p>
              </div>
              {/* <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  ⏳ <strong>What happens next?</strong> The clinic administrator will review your booking request. Once approved, a confirmation notification will be sent to your WhatsApp number.
                </p>
              </div> */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-[#1B4F72] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer outline-none"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-6">

              {/* Common Section: Name and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Email and Treatment Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Concern / Treatment *</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none bg-white"
                  >
                    {servicesList.map((svc) => (
                      <option key={svc.id} value={svc.name}>
                        {svc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Intake fields: Age, Gender, and Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Age *</label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {bookingType === 'online' && (
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Skin Type *</label>
                    <select
                      value={skinType}
                      onChange={(e) => setSkinType(e.target.value)}
                      className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none bg-white"
                    >
                      <option value="Dry">Dry Skin</option>
                      <option value="Oily">Oily Skin</option>
                      <option value="Combination">Combination Skin</option>
                      <option value="Sensitive">Sensitive Skin</option>
                      <option value="Normal">Normal Skin</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Physical / Postal Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, City, Pincode"
                  className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                />
              </div>

              {/* Advanced Clinical Inputs: Problem description and meds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Problem Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe symptoms, skin conditions, duration..."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Previous Medication (if any)</label>
                  <textarea
                    rows={3}
                    placeholder="List past treatments, ointments or steroids used..."
                    value={previousMedication}
                    onChange={(e) => setPreviousMedication(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Online Specific: Image Upload */}
              {bookingType === 'online' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Upload Skin Images (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-350 bg-white rounded-xl p-4 flex flex-col items-center justify-center text-center relative hover:border-primary transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {uploadingFiles ? 'Uploading assets...' : 'Drag skin photos here or Click to browse'}
                    </p>
                  </div>
                  {uploadedUrls.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                      {uploadedUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg border overflow-hidden group bg-gray-150">
                          <img src={url} alt="Skin Concern Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Time scheduler date (Read-only today's date) */}
              <div className="flex flex-col">
                <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Appointment Date
                </label>
                <div className="px-4 py-3 bg-white/60 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })})
                </div>
              </div>

              {/* Time scheduler slots grid */}
              {date && (
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-2">
                    Available {slotDuration}-Minute Timings *
                  </label>
                  {loadingSlots ? (
                    <p className="text-xs font-bold text-gray-500 animate-pulse">Loading slots...</p>
                  ) : fullyBooked ? (
                    <p className="text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
                      Fully booked for this day. Please pick another date.
                    </p>
                  ) : bookingClosed ? (
                    <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      Booking closed for today (after {cutoffTime}). Select tomorrow.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.status !== 'available'}
                          onClick={() => setTime(slot.time)}
                          className={`py-2.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${slot.status !== 'available'
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                            : time === slot.time
                              ? 'bg-primary text-white border-primary ring-2 ring-primary/30'
                              : 'bg-white text-gray-800 border-gray-300 hover:border-primary'
                            }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col">
                <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5">Additional Appointment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Mention any specifics, request video consult link preference..."
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-xs font-semibold outline-none"
                />
              </div>

              {/* Online payment toggle banner */}
              {bookingType === 'online' && (
                <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-xs">
                  <span className="text-xs font-bold flex items-center gap-2 text-gray-800">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Mandatory Consultation Fee: ₹{onlineFee}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Prepay UPI/Card</span>
                    <input
                      type="checkbox"
                      disabled={settings?.onlinePaymentMandatory}
                      checked={payOnline || !!settings?.onlinePaymentMandatory}
                      onChange={(e) => setPayOnline(e.target.checked)}
                      className="w-5 h-5 accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Warning/holiday notices */}
              {bookingType === 'offline' && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-teal-850 uppercase tracking-wider leading-relaxed">
                    OPD Visit Booked immediately. No prepayment required. Please verify details with clinic desk on arrival at clinic. Consultation fees is ₹{onlineFee}.
                  </p>
                </div>
              )}

              {errorText && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
                  {errorText}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !time || fullyBooked || bookingClosed}
                className="w-full py-4 bg-[#1B4F72] hover:bg-teal-650 text-white font-sans font-bold text-xs sm:text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md outline-none"
              >
                {loading ? <Clock className="w-5 h-5 animate-spin" /> : 'Confirm Booking Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

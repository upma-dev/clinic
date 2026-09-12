'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, AlertCircle, CreditCard, CheckCircle, Clock, Upload, X, ShieldAlert, Check, Copy, Printer, ExternalLink, Share2, ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { siteConfig } from '@/config/site';
import type { SlotAvailability, ClinicSettings } from '@/lib/types';
import { todayISO } from '@/lib/slots';

interface BookingFormProps {
  rescheduleBooking?: any | null;
  onSuccess?: (res?: any) => void;
  onCancel?: () => void;
}

export default function BookingForm({ rescheduleBooking, onSuccess, onCancel }: BookingFormProps = {}) {
  const [name, setName] = useState(rescheduleBooking?.name || '');
  const [phone, setPhone] = useState(rescheduleBooking?.phone || '');
  const [email, setEmail] = useState(rescheduleBooking?.email || '');
  const [service, setService] = useState(rescheduleBooking?.service || '');
  const [date, setDate] = useState(rescheduleBooking?.date || todayISO());
  const [time, setTime] = useState(rescheduleBooking?.time || '');
  const [message, setMessage] = useState(rescheduleBooking?.message || '');
  const [bookingType, setBookingType] = useState<'online' | 'offline'>(rescheduleBooking?.bookingType || 'online');
  const [payOnline, setPayOnline] = useState(rescheduleBooking?.payOnline ?? true);

  // Patient Intake Details
  const [gender, setGender] = useState(rescheduleBooking?.gender || 'Male');
  const [age, setAge] = useState(rescheduleBooking?.age ? String(rescheduleBooking.age) : '');
  const [address, setAddress] = useState(rescheduleBooking?.address || '');
  const [skinType, setSkinType] = useState(rescheduleBooking?.skinType || 'Normal');
  const [problemDescription, setProblemDescription] = useState(rescheduleBooking?.problemDescription || '');
  const [previousMedication, setPreviousMedication] = useState(rescheduleBooking?.previousMedication || '');
  const [appointmentNotes, setAppointmentNotes] = useState(rescheduleBooking?.appointmentNotes || '');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(rescheduleBooking?.images || []);

  // Admin Support Message Box States
  const [showSupportInput, setShowSupportInput] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSentSuccess, setSupportSentSuccess] = useState(false);
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const handleSendSupportMessage = async () => {
    if (!supportMsg.trim()) return;
    setIsSendingSupport(true);
    try {
      const apptId = mockPaymentModal?.appointmentId || 'SKNHB-GENERAL';
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Patient',
          phone: phone || '9876543210',
          email: email || '',
          category: 'payment',
          subject: `Payment Query for Ref #${apptId}`,
          message: supportMsg.trim(),
        }),
      });

      if (res.ok) {
        setSupportSentSuccess(true);
        const clinicNum = (settings?.clinicPhone || '919827042111').replace(/[^0-9]/g, '');
        const waText = `Hi Doctor/Admin, I booked appointment #${apptId} for ${name}. Message: ${supportMsg.trim()}`;
        const waUrl = `https://wa.me/${clinicNum}?text=${encodeURIComponent(waText)}`;
        
        window.open(waUrl, '_blank');

        setTimeout(() => {
          setSupportSentSuccess(false);
          setShowSupportInput(false);
          setSupportMsg('');
        }, 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingSupport(false);
    }
  };

  useEffect(() => {
    if (rescheduleBooking) {
      if (rescheduleBooking.name) setName(rescheduleBooking.name);
      if (rescheduleBooking.phone) setPhone(rescheduleBooking.phone);
      if (rescheduleBooking.email) setEmail(rescheduleBooking.email);
      if (rescheduleBooking.service) setService(rescheduleBooking.service);
      if (rescheduleBooking.date) setDate(rescheduleBooking.date);
      if (rescheduleBooking.time) setTime(rescheduleBooking.time);
      if (rescheduleBooking.gender) setGender(rescheduleBooking.gender);
      if (rescheduleBooking.age) setAge(String(rescheduleBooking.age));
      if (rescheduleBooking.address) setAddress(rescheduleBooking.address);
      if (rescheduleBooking.skinType) setSkinType(rescheduleBooking.skinType);
      if (rescheduleBooking.problemDescription) setProblemDescription(rescheduleBooking.problemDescription);
      if (rescheduleBooking.previousMedication) setPreviousMedication(rescheduleBooking.previousMedication);
      if (rescheduleBooking.appointmentNotes) setAppointmentNotes(rescheduleBooking.appointmentNotes);
      if (rescheduleBooking.bookingType) setBookingType(rescheduleBooking.bookingType);
    }
  }, [rescheduleBooking]);

  // Slots State
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [fullyBooked, setFullyBooked] = useState(false);
  const [bookingClosed, setBookingClosed] = useState(false);
  const [isClosedDay, setIsClosedDay] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
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
    isReschedule?: boolean;
    [key: string]: any;
  } | null>(null);
  const [errorText, setErrorText] = useState('');
  const [holdCountdown, setHoldCountdown] = useState<number | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const completeBookingSuccess = (data: any) => {
    setHoldCountdown(null);
    const resultObj = {
      id: data.id,
      token: data.token,
      status: data.status || 'Confirmed',
      paymentStatus: data.paymentStatus || 'Paid',
      name: data.name || name,
      phone: data.phone || phone,
      email: data.email || email,
      date: data.date || date,
      time: data.time || time,
      service: data.service || service,
      bookingType: data.bookingType || bookingType,
      amountPaid: data.amountPaid,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setBookingResult(resultObj);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('patient_phone', resultObj.phone);
        localStorage.setItem('last_booking_id', resultObj.id);
      } catch (e) {
        console.error('LocalStorage save error', e);
      }
    }

    if (onSuccess) {
      try { onSuccess(resultObj); } catch (e) { console.error(e); }
    }

    setTimeout(() => {
      const cardElem = document.getElementById('booking-result-card');
      if (cardElem) {
        cardElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  // Dynamic config parameters
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [onlineFee, setOnlineFee] = useState(200);
  const [offlineFee, setOfflineFee] = useState(200);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : null),
      fetch('/api/cms').then(r => r.ok ? r.json() : null)
    ]).then(([settingsData, cmsData]) => {
      if (settingsData) {
        setSettings(settingsData);
        setOnlineFee(settingsData.onlineConsultationFee || settingsData.consultationFee || 200);
        setOfflineFee(settingsData.offlineConsultationFee || settingsData.consultationFee || 200);
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
      setFullyBooked(false);
      setBookingClosed(false);
      setIsClosedDay(false);
      setIsHoliday(false);
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
          setIsClosedDay(!!data.isClosedDay);
          setIsHoliday(!!data.isHoliday);
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

  // 15-Minute Slot Hold Countdown Timer
  useEffect(() => {
    if (holdCountdown === null || holdCountdown <= 0) return;
    const interval = setInterval(() => {
      setHoldCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          fetchSlots();
          setErrorText('Your 15-minute slot hold has expired. Please pick an available slot to retry.');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [holdCountdown]);

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
    const selectedFiles = Array.from(e.target.files);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const urls: string[] = data.urls || (data.imageUrl ? [data.imageUrl] : []);
        if (urls.length > 0) {
          setUploadedUrls(prev => [...prev, ...urls]);
          return;
        }
      }

      // Fallback: Read as base64 locally if API returns non-OK or empty urls
      const fallbackUrls: string[] = [];
      for (const file of selectedFiles) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        fallbackUrls.push(base64);
      }
      setUploadedUrls(prev => [...prev, ...fallbackUrls]);
    } catch (err) {
      console.error('File upload fetch failed, using local FileReader fallback:', err);
      const fallbackUrls: string[] = [];
      for (const file of selectedFiles) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        fallbackUrls.push(base64);
      }
      setUploadedUrls(prev => [...prev, ...fallbackUrls]);
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

    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setErrorText('⚠️ Kripya 10-digit ka valid mobile number enter karein (digits only, e.g. 9876543210). Alphabets and symbols are not allowed.');
      setLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setErrorText('Kripya booking fee aur terms accept karein (Please accept the booking agreement checkbox before submitting).');
      setLoading(false);
      return;
    }

    try {
      if (rescheduleBooking) {
        const res = await fetch('/api/appointments/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: rescheduleBooking.id,
            action: 'reschedule',
            newDate: date,
            newTime: time,
            name,
            phone,
            email,
            service,
            gender,
            age,
            address,
            skinType: bookingType === 'online' ? skinType : undefined,
            problemDescription,
            previousMedication,
            appointmentNotes,
            reason: 'Patient updated booking details and rescheduled slot'
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 || data.error?.includes('already booked')) {
            fetchSlots();
            throw new Error(data.error || 'Yeh time slot pehle se booked hai. Kripya dusra time slot chunein.');
          }
          throw new Error(data.error || 'Reschedule failed');
        }

        setBookingResult({
          bookingId: rescheduleBooking.id,
          id: rescheduleBooking.id,
          queueToken: rescheduleBooking.tokenNumber || null,
          estimatedWaitMinutes: 0,
          isOnlineConsultation: bookingType === 'online',
          meetingLink: rescheduleBooking.meetingLink || undefined,
          isReschedule: true,
        });

        if (onSuccess) {
          onSuccess(data);
        }
        setLoading(false);
        return;
      }

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
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409 || errData.slotTaken) {
          fetchSlots(); // Automatically refresh slots to disable the taken slot
          throw new Error(errData.error || 'Yeh time slot abhi-abhi kisi aur patient ne reserve kar liya hai. Kripya naya slot select karein.');
        }
        throw new Error(errData.error || 'Booking failed');
      }

      const data = await res.json();

      if (data.holdExpiresAt) {
        const remaining = Math.max(0, Math.floor((new Date(data.holdExpiresAt).getTime() - Date.now()) / 1000));
        setHoldCountdown(remaining);
      }

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

        // Always open UPI QR payment modal
        setMockPaymentModal({
          show: true,
          appointmentId: data.appointmentId,
          fee: payData.amount / 100,
          orderId: payData.orderId,
          keyId: payData.keyId,
        });
        setLoading(false);
        return;

        /* 
        // Live Razorpay Script Checkout commented out
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
              const verifyRes = await fetch('/api/appointments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId: data.appointmentId,
                }),
              });

              const verifyData = await verifyRes.json().catch(() => ({}));

              if (!verifyRes.ok) {
                if (verifyRes.status === 409 && verifyData.conflict) {
                  setErrorText(verifyData.message || 'Payment received, but slot hold expired and was allotted to another patient. A full refund has been initiated.');
                  setHoldCountdown(null);
                  fetchSlots();
                  return;
                }
                throw new Error(verifyData.error || verifyData.message || 'Payment verification failed');
              }

              completeBookingSuccess({
                id: data.appointmentId,
                token: verifyData.tokenNumber,
                status: verifyData.status || 'Confirmed',
                paymentStatus: 'Paid',
                name,
                phone,
                email,
                date,
                time,
                service,
                bookingType,
                amountPaid: verifyData.amountPaid || (bookingType === 'online' ? onlineFee : offlineFee),
              });
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
        */

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
              const verifyRes = await fetch('/api/appointments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId: data.appointmentId,
                }),
              });

              const verifyData = await verifyRes.json().catch(() => ({}));

              if (!verifyRes.ok) {
                if (verifyRes.status === 409 && verifyData.conflict) {
                  setErrorText(verifyData.message || 'Payment received, but slot hold expired and was allotted to another patient. A full refund has been initiated.');
                  setHoldCountdown(null);
                  fetchSlots();
                  return;
                }
                throw new Error(verifyData.error || verifyData.message || 'Payment verification failed');
              }

              completeBookingSuccess({
                id: data.appointmentId,
                token: verifyData.tokenNumber,
                status: verifyData.status || 'Confirmed',
                paymentStatus: 'Paid',
                name,
                phone,
                email,
                date,
                time,
                service,
                bookingType,
                amountPaid: verifyData.amountPaid || (bookingType === 'online' ? onlineFee : offlineFee),
              });
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
        completeBookingSuccess({
          id: data.appointmentId,
          token: data.tokenNumber,
          status: data.status || 'Confirmed',
          paymentStatus: bookingType === 'online' ? 'Pending' : 'Pay at Clinic Desk',
          name,
          phone,
          email,
          date,
          time,
          service,
          bookingType,
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
      if (success) {
        // Direct verify API for instant 100% test payment success
        const verifyRes = await fetch('/api/appointments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isMock: true,
            bookingId: appointmentId,
            razorpay_order_id: orderId,
            razorpay_payment_id: 'mock_payment_' + Date.now(),
          }),
        });

        const verifyData = await verifyRes.json().catch(() => ({}));
        if (verifyRes.ok) {
          completeBookingSuccess({
            id: appointmentId,
            token: verifyData.tokenNumber,
            status: verifyData.status || 'Confirmed',
            paymentStatus: 'Paid',
            name,
            phone,
            email,
            date,
            time,
            service,
            bookingType,
            amountPaid: fee,
          });
          return;
        }
      }

      // Trigger Razorpay Webhook API as fallback
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
            completeBookingSuccess({
              id: appointmentId,
              token: statusData.tokenNumber,
              status: statusData.status || 'Confirmed',
              paymentStatus: 'Paid',
              name,
              phone,
              email,
              date,
              time,
              service,
              bookingType,
              amountPaid: fee,
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

  const maxAdvanceDays = settings?.advanceBookingDays || 7;

  // Generate array of open dates starting from Today up to maxAdvanceDays
  const openDatesList = Array.from({ length: Math.min(14, maxAdvanceDays) }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const isToday = i === 0;
    return { iso, dayName, isToday };
  });

  const minDateISO = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + (maxAdvanceDays - 1));
  const maxDateISO = maxDateObj.toISOString().split('T')[0];

  const slotDuration = bookingType === 'offline' ? (settings?.slotDurationMinutes || 3) : (settings?.onlineSlotDuration || 15);
  const cutoffTime = settings ? `${settings.bookingCutoffHour}:${String(settings.bookingCutoffMinute || 0).padStart(2, '0')}` : '07:30 PM';

  const allowedDays = settings
    ? (bookingType === 'online' ? (settings.onlineDays || settings.availableDays) : settings.availableDays)
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const closedDays = daysOfWeek.filter(d => !allowedDays.includes(d));

  const getSelectedDayName = () => {
    if (!date) return '';
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' });
  };

  return (
    <section id="bookings" className="py-3 sm:py-10 bg-white select-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Instant Online Payment Checkout Modal Overlay */}
        {mockPaymentModal && (
          <div className="fixed inset-0 bg-[#0B1B29]/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-3xl border border-gray-200 shadow-2xl p-6 sm:p-8 space-y-6 text-left relative animate-fade-in-up overflow-hidden select-text">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-playfair text-xl font-black text-gray-950 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#1B4F72]" />
                    Clinic Online Payment Gateway
                  </h3>
                  <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                    Secure UPI & WhatsApp Payment Verification Portal
                  </p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-200 uppercase tracking-wider">
                  🔒 Encrypted
                </span>
              </div>

              {/* Booking & Fee Info Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 font-sans text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-bold">Appointment Ref:</span>
                  <span className="font-mono text-base font-black text-[#1B4F72]">#{mockPaymentModal.appointmentId}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-gray-900 font-black">Mandatory Payable Fee:</span>
                  <span className="text-lg font-black text-emerald-700">₹{mockPaymentModal.fee}</span>
                </div>
              </div>

              {/* QR Code Scan section */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-emerald-300/60 rounded-2xl p-5 text-center space-y-3 shadow-inner">
                <p className="text-xs font-black uppercase text-emerald-950 tracking-wider">
                  📲 Scan QR & Pay via GPay / PhonePe / Paytm / BHIM
                </p>
                
                {/* Dynamically Generated Clean QR Code SVG display */}
                <div className="bg-white p-3 rounded-2xl border-2 border-emerald-400 shadow-md inline-block mx-auto">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=skinhubclinic@upi&pn=Skin%20Hub%20Clinic&am=${mockPaymentModal.fee}&cu=INR&tn=Booking%20${mockPaymentModal.appointmentId}`)}`}
                    alt="Clinic Payment QR Code"
                    className="w-40 h-40 object-contain mx-auto rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-center mt-1.5">
                    <span className="text-[11px] font-mono font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                      UPI ID: skinhubclinic@upi
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-900 font-bold leading-relaxed max-w-sm mx-auto">
                  • QR scan karke pay karein aur niche <strong className="text-emerald-800">"🟢 Send Payment Screenshot on WhatsApp"</strong> button par click karke screenshot share karein!
                </p>
              </div>

              {/* Payment Action Buttons */}
              <div className="space-y-3 pt-1">
                {/* Primary WhatsApp Screenshot Sharing Button */}
                <button
                  type="button"
                  onClick={async () => {
                    const clinicNum = (settings?.clinicPhone || '919827042111').replace(/[^0-9]/g, '');
                    const waText = `*🌟 Skin Hub Clinic — Online Payment Verification* 💳\n\nNamaste Dr. Prateek Tiwari / Admin! 🙏\n\nMaine ₹${mockPaymentModal.fee} ka payment QR Code scan karke pay kar diya hai.\n\n👤 *Patient Name:* ${name}\n📞 *Phone:* ${phone}\n📅 *Booking Ref:* #${mockPaymentModal.appointmentId}\n⏰ *Slot:* ${date} at ${time}\n\n📸 *Please check attached payment screenshot with my name: ${name}.*`;
                    const waUrl = `https://wa.me/${clinicNum}?text=${encodeURIComponent(waText)}`;
                    
                    window.open(waUrl, '_blank');
                    await handleMockVerify(true);
                  }}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-sans font-black text-xs rounded-2xl shadow-md cursor-pointer text-center outline-none flex items-center justify-center gap-2 transition-all"
                >
                  <Share2 className="w-4.5 h-4.5 text-white" />
                  <span>🟢 Send Payment Screenshot on WhatsApp</span>
                </button>

                {/* Admin Support & Help Box */}
                {!showSupportInput ? (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSupportInput(true)}
                      className="flex-1 py-3 px-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-sans font-bold text-xs rounded-2xl cursor-pointer text-center flex items-center justify-center gap-2 transition-all shadow-2xs"
                    >
                      <Mail className="w-4 h-4 text-blue-600" />
                      💬 Contact Doctor / Admin Support
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMockVerify(false)}
                      className="py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-sans font-bold text-xs rounded-2xl cursor-pointer text-center flex items-center justify-center gap-1 transition-all"
                    >
                      <X className="w-4 h-4" /> Close
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-50/90 border-2 border-blue-200 rounded-2xl p-4 space-y-3 animate-fade-in text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                        💬 Message to Doctor / Admin
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSupportInput(false)}
                        className="text-gray-400 hover:text-gray-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                      placeholder="Payment ya slot regarding koi question/problem hai? Yahan message type karein..."
                      className="w-full p-3 bg-white border border-blue-300 rounded-xl text-xs font-semibold outline-none focus:border-blue-600 text-gray-900 placeholder:text-gray-400 shadow-inner"
                    />

                    {supportSentSuccess && (
                      <p className="text-[11px] text-emerald-800 font-bold bg-emerald-100 p-2.5 rounded-xl border border-emerald-300">
                        ✅ Aapka message Doctor / Admin Console me bhej diya gaya hai!
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSendingSupport || !supportMsg.trim()}
                        onClick={handleSendSupportMessage}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSendingSupport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        <span>Send Message to Admin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSupportInput(false)}
                        className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Banner */}
        {rescheduleBooking && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-left shadow-xs">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Rescheduling Appointment</p>
                <p className="text-xs font-semibold mt-0.5">Booking Ref: <strong className="font-mono text-primary">#{rescheduleBooking.id}</strong> • Current Slot: <strong>{rescheduleBooking.date} ({rescheduleBooking.time})</strong></p>
                <p className="text-[11px] text-amber-700 mt-0.5">You can update your personal details, problem notes, date, and choose any available slot below.</p>
              </div>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Heading */}
        <div className="mb-4 sm:mb-8 text-center">
          <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-primary/10 text-primary font-sans text-[11px] font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Flexible OPD Scheduler
          </span>
          <h2 className="font-playfair text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Book Your Consultation
          </h2>
          <p className="font-sans text-gray-700 mt-1 text-xs sm:text-base max-w-xl mx-auto leading-normal font-semibold">
            Choose online consultation or schedule physical clinic visit.
          </p>
        </div>

        {/* Dynamic type filters */}
        <div className="flex flex-col items-center mb-4 sm:mb-6 font-sans space-y-3">
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

          {/* Prominent Bilingual Payment Rules Notice Card */}
          <div className="max-w-2xl w-full bg-white border-2 border-[#1B4F72]/30 rounded-2xl p-4 shadow-md text-left space-y-2">
            {bookingType === 'online' ? (() => {
              const totalFee = settings?.onlineConsultationFee || onlineFee || 500;
              const isPreBooking = (settings?.onlinePaymentTiming ?? (settings?.onlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking';

              return (
                <div>
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <span className="text-xs font-black uppercase text-[#1B4F72] flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#1B4F72]" /> Online Video Consult Fee Rules
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                      {isPreBooking ? '⚡ Full Prepayment Mandatory' : '⏳ Pay After Consult'}
                    </span>
                  </div>

                  <div className="space-y-1 font-sans text-xs">
                    <p className="font-extrabold text-gray-900">
                      Consultation Fee: <span className="text-[#1B4F72] text-sm font-black">₹{totalFee}</span>
                    </p>
                    <p className="text-gray-700 font-bold leading-relaxed text-[11px]">
                      {isPreBooking ? (
                        <>• Online Video Consult confirm karne ke liye online prepayment <strong className="text-primary">₹{totalFee}</strong> (UPI / QR) mandatory hai.</>
                      ) : (
                        <>• Video consult ke baad payment karein. Abhi koi prepayment nahi dena hai.</>
                      )}
                    </p>
                  </div>
                </div>
              );
            })() : (() => {
              const totalFee = settings?.offlineConsultationFee || settings?.consultationFee || offlineFee || 200;
              const advanceFee = settings?.offlinePreBookingFee ?? 50;
              const isPreBooking = (settings?.offlinePaymentTiming ?? (settings?.offlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking';

              return (
                <div>
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-600" /> OPD Clinic Visit Fee Rules
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {isPreBooking ? '⚡ Advance Prepayment (Online QR)' : '🏥 Pay at Clinic Desk'}
                    </span>
                  </div>

                  <div className="space-y-1 font-sans text-xs">
                    <p className="font-extrabold text-gray-900">
                      {isPreBooking ? (
                        advanceFee < totalFee ? (
                          <>Pre-Booking Advance Fee: <span className="text-amber-800 text-sm font-black">₹{advanceFee}</span> (Total OPD Fee: ₹{totalFee})</>
                        ) : (
                          <>OPD Checkup Fee: <span className="text-amber-800 text-sm font-black">₹{totalFee}</span></>
                        )
                      ) : (
                        <>OPD Checkup Fee: <span className="text-emerald-700 text-sm font-black">₹{totalFee}</span></>
                      )}
                    </p>
                    <p className="text-gray-700 font-bold leading-relaxed text-[11px]">
                      {isPreBooking ? (
                        advanceFee < totalFee ? (
                          <>• OPD Slot confirm karne ke liye <strong className="text-amber-800">₹{advanceFee}</strong> advance online (UPI / QR) pay karein. Baki ₹{totalFee - advanceFee} clinic desk par aane par pay karein.</>
                        ) : (
                          <>• OPD Slot confirm karne ke liye online prepayment <strong className="text-amber-800">₹{totalFee}</strong> mandatory hai.</>
                        )
                      ) : (
                        <>• OPD booking turant ho jayegi. Koi advance payment nahi dena hai — fee <strong className="text-emerald-800">₹{totalFee}</strong> clinic desk arrival par pay karein.</>
                      )}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Main form */}
        <div className="bg-[#F8F6F2] rounded-2xl border border-gray-300 p-6 sm:p-10 shadow-xl text-left relative overflow-hidden">

          {bookingResult ? (
            <div id="booking-result-card" className="space-y-6 text-center py-4 animate-fade-in select-text">
              {/* Success Hero Header */}
              <div className="bg-emerald-50/90 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white font-mono text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  MongoDB Saved & Confirmed
                </div>

                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30 mb-4 animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>

                <h3 className="font-playfair text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                  🎉 Appointment Saved in Database!
                </h3>
                <p className="font-sans text-xs sm:text-sm text-emerald-800 font-bold max-w-lg mx-auto leading-relaxed mt-2">
                  Aapka booking record MongoDB Database me successfully save aur verify ho chuka hai.
                </p>

                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-white/90 border border-emerald-300 rounded-full text-emerald-900 font-mono text-[11px] font-bold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Verified at {bookingResult.savedAt || new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Detailed Summary Card */}
              <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 sm:p-8 text-left space-y-4 shadow-lg relative">
                <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-2">
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Booking Reference ID</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xl sm:text-2xl font-black text-[#1B4F72]">#{bookingResult.id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(bookingResult.id);
                            setCopiedRef(true);
                            setTimeout(() => setCopiedRef(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg border border-gray-300 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedRef ? 'Copied!' : 'Copy ID'}
                      </button>
                    </div>
                  </div>

                  {bookingResult.token && (
                    <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-2 text-right">
                      <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider block">OPD Token No</span>
                      <span className="font-mono text-2xl font-black text-amber-900">#{bookingResult.token}</span>
                    </div>
                  )}
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-0.5">Patient Details</span>
                    <p className="font-bold text-gray-900 text-sm">{bookingResult.name || name}</p>
                    <p className="text-gray-600 font-semibold text-xs mt-0.5">📞 {bookingResult.phone || phone}</p>
                    {bookingResult.email && <p className="text-gray-500 font-medium text-xs truncate mt-0.5">✉️ {bookingResult.email}</p>}
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-0.5">Appointment Schedule</span>
                    <p className="font-bold text-[#1B4F72] text-sm">📅 {bookingResult.date || date}</p>
                    <p className="text-gray-700 font-extrabold text-xs mt-0.5">⏰ Slot: {bookingResult.time || time}</p>
                    <p className="text-gray-600 font-medium text-[11px] mt-0.5">
                      Type: <strong className="uppercase">{bookingResult.bookingType === 'online' ? '🌐 Online Video' : '🏥 Offline OPD Visit'}</strong>
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-0.5">Treatment / Service</span>
                    <p className="font-bold text-gray-900 text-sm">{bookingResult.service || service}</p>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-0.5">Payment & Status</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        bookingResult.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {bookingResult.paymentStatus === 'Paid' ? '💳 Paid (UPI Verified)' : '⏳ Pay at Clinic Desk'}
                      </span>
                    </div>
                    {bookingResult.amountPaid && (
                      <p className="text-[11px] font-bold text-gray-600 mt-1">Amount: ₹{bookingResult.amountPaid}</p>
                    )}
                  </div>
                </div>

                {/* Next steps box */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs font-semibold text-blue-950 space-y-1">
                  <p className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    What happens next?
                  </p>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    Clinic team ko aapki booking ka alert mil gaya hai. Virtual video consultation link ya clinic token details WhatsApp/SMS par receive honge. Aap Patient Portal se ise search and view kar sakte hain.
                  </p>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-2xl mx-auto">
                <a
                  href="/users"
                  className="py-3.5 px-4 bg-[#1B4F72] hover:bg-[#143D59] text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  📱 Open Patient Portal (View Booking)
                </a>

                <a
                  href={`https://wa.me/${(settings?.clinicPhone || '919827042111').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`*🌟 Skin Hub Clinic — Online Payment Verification* 💳\n\nNamaste Dr. Prateek Tiwari / Admin! 🙏\n\nMaine ₹${bookingResult.amountPaid || 500} ka payment QR Code scan karke pay kar diya hai.\n\n👤 *Patient Name:* ${bookingResult.name || name}\n📞 *Phone:* ${bookingResult.phone || phone}\n📅 *Booking Ref:* #${bookingResult.id}\n⏰ *Slot:* ${bookingResult.date || date} at ${bookingResult.time || time}\n\n📸 *Please check attached payment screenshot with my name: ${bookingResult.name || name}.*`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  💬 Share Payment Screenshot on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs rounded-2xl border border-gray-300 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-gray-600 shrink-0" />
                  🖨️ Print / Save Receipt
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  ➕ Book Another Appointment
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
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                    <span>Phone Number *</span>
                    {phone && phone.length < 10 && (
                      <span className="text-rose-600 text-[10px] font-extrabold lowercase">
                        ({phone.length}/10 digits)
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => {
                      // Allow ONLY numeric digits (0-9) and max 10 digits
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(digitsOnly);
                    }}
                    className={`px-4 py-3 bg-white border rounded-lg text-xs font-semibold outline-none transition-colors ${
                      phone && phone.length !== 10
                        ? 'border-rose-400 focus:border-rose-600 bg-rose-50/20'
                        : 'border-gray-300 focus:border-[#1B4F72]'
                    }`}
                  />
                  {phone && phone.length > 0 && phone.length < 10 && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1">
                      ⚠️ Kripya 10-digit ka valid mobile number enter karein (digits only).
                    </p>
                  )}
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

              {/* Interactive Appointment Date Selector (constrained to maxAdvanceDays window) */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#1B4F72]" /> Select Appointment Date *
                  </label>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-full">
                    {maxAdvanceDays} Days Booking Window
                  </span>
                </div>

                {/* Quick Selection Date Pills */}
                <div className="flex flex-wrap gap-2">
                  {openDatesList.map((dItem) => {
                    const isSelected = date === dItem.iso;
                    const parts = dItem.iso.split('-');
                    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    const monthStr = dateObj.toLocaleDateString('en-IN', { month: 'short' });

                    return (
                      <button
                        key={dItem.iso}
                        type="button"
                        onClick={() => {
                          setDate(dItem.iso);
                          setTime('');
                        }}
                        className={`px-3 py-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-w-[70px] ${
                          isSelected
                            ? 'bg-[#1B4F72] text-white border-[#1B4F72] shadow-xs ring-2 ring-[#1B4F72]/30'
                            : 'bg-white text-gray-800 border-gray-300 hover:border-[#1B4F72]'
                        }`}
                      >
                        <span className="text-[9px] uppercase font-black tracking-wider opacity-80">
                          {dItem.isToday ? 'Today' : dItem.dayName}
                        </span>
                        <span className="text-xs font-extrabold mt-0.5">
                          {parts[2]} {monthStr}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Date Input constrained between Today and maxDateISO */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Custom Date:</span>
                  <input
                    type="date"
                    min={minDateISO}
                    max={maxDateISO}
                    value={date}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDate(e.target.value);
                        setTime('');
                      }
                    }}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-hidden focus:border-[#1B4F72] cursor-pointer"
                  />
                </div>

                {closedDays.length > 0 && (
                  <p className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200/50 rounded-lg px-2.5 py-1 w-fit">
                    ⚠️ Closed on: {closedDays.join(', ')}
                  </p>
                )}
              </div>

              {/* Time scheduler slots grid */}
              {date && (
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-2">
                    Available {slotDuration}-Minute Timings *
                  </label>
                  {loadingSlots ? (
                    <p className="text-xs font-bold text-gray-500 animate-pulse">Loading slots...</p>
                  ) : isHoliday ? (
                    <p className="text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
                      The clinic is closed today due to a public holiday or special schedule.
                    </p>
                  ) : isClosedDay ? (
                    <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      The clinic is closed today ({getSelectedDayName()}). Please visit us on our working days.
                    </p>
                  ) : fullyBooked ? (
                    <p className="text-xs font-bold text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
                      Fully booked for this day. Please pick another date.
                    </p>
                  ) : bookingClosed ? (
                    <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      Booking closed for today (after {cutoffTime}). Select tomorrow.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-250 rounded-xl bg-gray-50/30 shadow-2xs">
                        {slots.map((slot) => {
                          const isAvailable = slot.status === 'available';
                          const isBooked = slot.status === 'booked';
                          const isBlocked = slot.status === 'blocked';
                          
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!isAvailable}
                              title={isBlocked ? "Blocked by Doctor" : isBooked ? "Already Booked" : "Available"}
                              onClick={() => setTime(slot.time)}
                              className={`py-2.5 px-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                isAvailable
                                  ? time === slot.time
                                    ? 'bg-primary text-white border-primary ring-2 ring-primary/30 shadow-xs'
                                    : 'bg-white text-gray-800 border-gray-300 hover:border-primary'
                                  : isBlocked
                                    ? 'bg-rose-50 text-rose-500 border-rose-200 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend Indicator */}
                      <div className="flex items-center gap-4 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 justify-center flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-white border border-gray-300 shadow-2xs" />
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200 line-through" />
                          <span>Booked</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-rose-50 border border-rose-200" />
                          <span>Blocked</span>
                        </div>
                      </div>
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

              {/* Online payment info banner */}
              {bookingType === 'online' && (() => {
                const totalFee = settings?.onlineConsultationFee || onlineFee || 500;
                const isPreBooking = (settings?.onlinePaymentTiming ?? (settings?.onlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking';

                return (
                  <div className="p-4 bg-[#1B4F72]/5 border border-[#1B4F72]/20 rounded-xl flex items-start gap-2.5">
                    <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-[10px] font-bold text-gray-800 uppercase tracking-wider leading-relaxed">
                      {isPreBooking ? (
                        <span>
                          Online Consultation Fee: <strong className="text-primary text-xs">₹{totalFee}</strong>. Prepayment (UPI / QR) is required to complete and confirm your video consultation booking.
                        </span>
                      ) : (
                        <span>
                          Online Consultation Fee: <strong>₹{totalFee}</strong>. Pay after consultation — No prepayment required right now.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Offline OPD Visit payment info banner */}
              {bookingType === 'offline' && (() => {
                const totalFee = settings?.offlineConsultationFee || settings?.consultationFee || offlineFee || 200;
                const advanceFee = settings?.offlinePreBookingFee ?? 50;
                const isPreBooking = (settings?.offlinePaymentTiming ?? (settings?.offlinePaymentMandatory ? 'pre_booking' : 'after_booking')) === 'pre_booking';

                return (
                  <div className={`p-4 rounded-xl flex items-start gap-2.5 ${isPreBooking ? 'bg-amber-50/70 border border-amber-200' : 'bg-teal-50 border border-teal-200'}`}>
                    {isPreBooking ? <CreditCard className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /> : <ShieldAlert className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />}
                    <div className={`text-[10px] font-bold uppercase tracking-wider leading-relaxed ${isPreBooking ? 'text-amber-950' : 'text-teal-850'}`}>
                      {isPreBooking ? (
                        advanceFee < totalFee ? (
                          <span>
                            OPD Consultation Fee: <strong>₹{totalFee}</strong> • Pre-Booking Advance Fee: <strong className="text-amber-700 text-xs">₹{advanceFee}</strong>. Online advance payment of ₹{advanceFee} is required to confirm your OPD slot. Remaining ₹{totalFee - advanceFee} to be paid at clinic desk.
                          </span>
                        ) : (
                          <span>
                            OPD Consultation Fee: <strong className="text-amber-700 text-xs">₹{totalFee}</strong>. Prepayment is required to confirm your OPD slot.
                          </span>
                        )
                      ) : (
                        <span>
                          OPD Consultation Fee: <strong>₹{totalFee}</strong>. Booked immediately — No prepayment required. Pay full fee ₹{totalFee} at clinic desk on arrival.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {!bookingResult && !mockPaymentModal && holdCountdown !== null && holdCountdown > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-amber-900 shadow-sm animate-pulse">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                    <span className="text-xs font-bold">
                      Slot Reserved: Complete payment before timer expires
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono bg-amber-200 px-2.5 py-1 rounded-md text-amber-950">
                    {Math.floor(holdCountdown / 60)}:{String(holdCountdown % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Mandatory Fee & Policy Consent Checkbox */}
              <div className="p-4 bg-white border-2 border-gray-300 rounded-xl flex items-start gap-3 text-left shadow-2xs hover:border-[#1B4F72] transition-colors">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4.5 h-4.5 mt-0.5 accent-[#1B4F72] rounded cursor-pointer shrink-0"
                />
                <label htmlFor="agreeTerms" className="text-xs text-gray-900 font-bold cursor-pointer leading-relaxed select-none">
                  <span>I agree to the Admin-configured consultation fee & clinic booking rules *</span>
                  <span className="block text-[11px] text-[#1B4F72] font-extrabold mt-0.5">
                    मैं क्लिनिक/डॉक्टर द्वारा तय की गई फीस नियमों और बुकिंग शर्तों से पूर्णतः सहमत हूँ। (bina tick kiye booking submit nahi hogi).
                  </span>
                </label>
              </div>

              {errorText && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
                  {errorText}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !time || fullyBooked || bookingClosed || isClosedDay || isHoliday}
                className="w-full py-4 bg-[#1B4F72] hover:bg-teal-650 text-white font-sans font-bold text-xs sm:text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md outline-none transition-all"
              >
                {loading ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : rescheduleBooking ? (
                  'Confirm Reschedule & Save Changes'
                ) : (
                  'Confirm Booking Request'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

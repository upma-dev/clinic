'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, RefreshCw, AlertCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import type { Booking, BookingStatus, PaymentStatus } from '@/lib/types';

interface PatientPaymentsProps {
  patient: any;
}

export default function PatientPayments({ patient }: PatientPaymentsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  // Razorpay mock modal state
  const [mockPaymentModal, setMockPaymentModal] = useState<{
    show: boolean;
    appointmentId: string;
    fee: number;
    orderId: string;
    keyId: string;
  } | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/patient/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      } else {
        setError('Failed to load transaction history.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRetryPayment = async (bk: Booking) => {
    setPayingId(bk.id);
    setError('');

    try {
      const payRes = await fetch('/api/appointments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: bk.id }),
      });

      if (!payRes.ok) {
        throw new Error('Payment gateway order generation failed.');
      }

      const payData = await payRes.json();

      if (payData.isMock) {
        setMockPaymentModal({
          show: true,
          appointmentId: bk.id,
          fee: payData.amount / 100,
          orderId: payData.orderId,
          keyId: payData.keyId,
        });
        return;
      }

      // Live Razorpay script loading
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Razorpay SDK failed to load.');
      }

      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: 'Skin Hub Clinic',
        description: `Retry Consultation Payment - ${bk.name}`,
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
                bookingId: bk.id,
              }),
            });

            if (!verifyRes.ok) {
              throw new Error('Payment verification failed');
            }

            fetchBookings();
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
          } finally {
            setLoading(false);
            setPayingId(null);
          }
        },
        prefill: {
          name: bk.name,
          email: bk.email || '',
          contact: bk.phone,
        },
        theme: {
          color: '#1B4F72',
        },
        modal: {
          ondismiss: () => {
            setPayingId(null);
            setError('Payment checkout cancelled.');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
      setPayingId(null);
    }
  };

  const handleMockVerify = async (success: boolean) => {
    if (!mockPaymentModal) return;
    setLoading(true);
    const appointmentId = mockPaymentModal.appointmentId;
    const orderId = mockPaymentModal.orderId;
    const fee = mockPaymentModal.fee;
    setMockPaymentModal(null);

    try {
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
        throw new Error('Simulation webhook dispatch failed.');
      }

      // Poll status
      let attempts = 0;
      const maxAttempts = 6;
      const checkStatus = async () => {
        const statusRes = await fetch(`/api/appointments/status?id=${appointmentId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (success && statusData.paymentStatus === 'Paid') {
            fetchBookings();
            return true;
          } else if (!success && statusData.paymentStatus === 'Failed') {
            setError('Mock Payment failed.');
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
      setError(err.message);
    } finally {
      setLoading(false);
      setPayingId(null);
    }
  };

  const getPaymentBadge = (status?: PaymentStatus) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'paid':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">Paid</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">Pending</span>;
      case 'failed':
        return <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">Failed</span>;
      case 'refunded':
        return <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase">Refunded</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-[10px] font-black uppercase">Unpaid</span>;
    }
  };

  const getStatusBadge = (status?: BookingStatus) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase">Confirmed</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full bg-teal-500 text-white text-[10px] font-black uppercase">Completed</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase">Pending Approval</span>;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Mock payment modal overlay */}
      {mockPaymentModal && (
        <div className="fixed inset-0 bg-[#0B1B29]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 text-left relative animate-fade-in-up">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-playfair text-lg font-black text-gray-950 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Razorpay Sandbox
              </h3>
              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase">
                Mock
              </span>
            </div>
            <div className="space-y-3 font-sans text-xs font-semibold text-gray-700">
              <p>Reference: <span className="font-mono text-primary font-bold">{mockPaymentModal.appointmentId}</span></p>
              <p>Consultation Fee: <span className="text-sm font-bold text-gray-900">₹{mockPaymentModal.fee}</span></p>
              <p className="text-gray-500 text-[11px] leading-relaxed">
                Retry checkout in development mode. Simulating verification sends mock event webhooks to verify database records.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleMockVerify(true)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs rounded-xl shadow-xs cursor-pointer text-center outline-none"
              >
                Simulate Success (Paid)
              </button>
              <button
                onClick={() => handleMockVerify(false)}
                className="flex-1 py-3 border border-gray-250 text-gray-700 font-sans font-bold text-xs rounded-xl cursor-pointer text-center outline-none"
              >
                Simulate Failure
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-250 text-rose-850 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 font-semibold mt-3">Loading transaction records...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-gray-50 rounded-full border flex items-center justify-center mx-auto text-gray-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-gray-500 font-semibold text-sm">No appointment registrations or transactions found under {patient.phone}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {bookings.map((bk) => {
            const isPaid = String(bk.paymentStatus).toLowerCase() === 'paid';
            const isPending = String(bk.paymentStatus).toLowerCase() === 'pending' || String(bk.paymentStatus).toLowerCase() === 'failed';
            const isCancelled = String(bk.status).toLowerCase() === 'cancelled';

            return (
              <div 
                key={bk.id} 
                className="bg-white rounded-2xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(bk.status)}
                    {bk.payOnline && getPaymentBadge(bk.paymentStatus)}
                    <span className="font-mono text-[9px] font-black text-gray-400 bg-gray-50 border px-2 py-0.5 rounded">
                      ID: {bk.id}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-playfair text-lg font-black text-gray-900">{bk.service}</h4>
                    <p className="text-xs text-gray-600 font-semibold mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {bk.date} at {bk.time}
                    </p>
                  </div>

                  {/* Metadata display if paid */}
                  {bk.payOnline && isPaid && (
                    <div className="bg-emerald-50/20 border border-emerald-100 p-3 rounded-xl space-y-1 font-mono text-[10px] text-gray-700">
                      <p>Amount: <span className="font-sans font-bold text-gray-900">₹{bk.amountPaid || 500}</span></p>
                      {bk.razorpayOrderId && <p>Order ID: {bk.razorpayOrderId}</p>}
                      {bk.razorpayPaymentId && <p>Payment ID: {bk.razorpayPaymentId}</p>}
                      {bk.paidAt && <p>Paid At: {new Date(bk.paidAt).toLocaleString()}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5 shrink-0 items-center md:self-center">
                  {/* Download Invoice Button */}
                  {bk.payOnline && (
                    <button
                      onClick={() => window.open(`/api/appointments/invoice?id=${bk.id}`, '_blank')}
                      className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-gray-500" />
                      View Invoice
                    </button>
                  )}

                  {/* Retry Payment Button */}
                  {bk.payOnline && isPending && !isCancelled && (
                    <button
                      onClick={() => handleRetryPayment(bk)}
                      disabled={payingId === bk.id}
                      className="px-4 py-2.5 bg-primary text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:brightness-110 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${payingId === bk.id ? 'animate-spin' : ''}`} />
                      {payingId === bk.id ? 'Loading...' : 'Retry Payment'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

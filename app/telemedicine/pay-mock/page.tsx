'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, CreditCard, ShieldAlert } from 'lucide-react';

export default function PayMockPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [error, setError] = useState('');

  const handleSimulate = async (success: boolean) => {
    setLoading(true);
    setError('');

    try {
      if (!success) {
        setStatus('failed');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/appointments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'mock_order_' + Date.now(),
          razorpay_payment_id: 'mock_payment_' + Date.now(),
          razorpay_signature: 'mock_signature_123',
          bookingId,
          isMock: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border p-6 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h1 className="text-lg font-bold text-gray-900">Missing Booking ID</h1>
          <p className="text-xs text-gray-500">Could not resolve the booking reference parameter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl border shadow-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black text-gray-900 uppercase tracking-wide">Razorpay Mock Payment</h1>
          <p className="text-xs text-gray-500">Booking ID: <span className="font-mono font-bold text-gray-800">{bookingId}</span></p>
        </div>

        {status === 'idle' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-bold uppercase tracking-wider leading-relaxed">
              This is a sandbox simulation page representing the Razorpay Checkout Portal for local environment runs.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={loading}
                onClick={() => handleSimulate(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer outline-none transition-all"
              >
                {loading ? 'Processing...' : 'Simulate Success'}
              </button>
              <button
                disabled={loading}
                onClick={() => handleSimulate(false)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer outline-none transition-all"
              >
                Simulate Fail
              </button>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-3 py-4 animate-fade-in">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-base font-black text-gray-900 uppercase">Payment Successful!</h2>
            <p className="text-xs text-gray-500">
              The booking status has been successfully updated to verified and confirmed. You can close this tab now.
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center space-y-3 py-4 animate-fade-in">
            <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
            <h2 className="text-base font-black text-gray-900 uppercase">Payment Aborted</h2>
            <p className="text-xs text-gray-500">
              {error || 'The payment simulation was marked as failed or cancelled.'}
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 text-xs font-bold text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

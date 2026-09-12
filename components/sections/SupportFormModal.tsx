'use client';

import React, { useState } from 'react';
import { LifeBuoy, X, CheckCircle, Send, AlertCircle, Phone, MessageSquare } from 'lucide-react';

interface SupportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportFormModal({ isOpen, onClose }: SupportFormModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<'booking_issue' | 'payment_issue' | 'consultation_help' | 'general'>('booking_issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !subject || !message) {
      setErrorMsg('कृपया नाम, मोबाइल नंबर, विषय और संदेश भरें। / Please fill all required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          category,
          subject,
          message,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ticket) {
        setTicketId(data.ticket.ticketId);
        setName('');
        setPhone('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setErrorMsg(data.error || 'सबमिशन में त्रुटि आई। / Failed to submit support request.');
      }
    } catch {
      setErrorMsg('नेटवर्क त्रुटि हुई। कृपया पुनः प्रयास करें। / Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <LifeBuoy className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-playfair text-lg font-bold">हेल्प एवं सपोर्ट डेस्क / Patient Support</h3>
              <p className="text-xs text-teal-200">अपनी समस्या या सवाल एडमिन और स्टाफ को भेजें</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {ticketId ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="font-playfair text-xl font-bold text-gray-900">सपोर्ट टिकट सबमिट हो गया!</h4>
              <p className="text-sm text-gray-600">
                आपकी सहायता अनुरोध टिकट आईडी <strong className="text-emerald-700 font-mono text-base">{ticketId}</strong> के साथ दर्ज कर ली गई है। एडमिन/स्टाफ जल्द ही आपसे संपर्क करेंगे।
              </p>
              <div className="p-3 bg-teal-50 rounded-xl text-xs text-teal-800 border border-teal-200 font-semibold">
                Your support query has been forwarded to clinic admin and staff.
              </div>
              <button
                onClick={() => {
                  setTicketId(null);
                  onClose();
                }}
                className="w-full py-3 bg-[#1B4F72] text-white rounded-xl font-bold text-sm hover:bg-[#113249] transition-colors shadow-md"
              >
                बंद करें / Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  पूरा नाम / Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा. राहुल शर्मा / Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    मोबाइल नंबर / Mobile No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ईमेल (वैकल्पिक) / Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  सहायता श्रेणी / Support Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="booking_issue">📅 बुकिंग में सहायता (Booking Issue)</option>
                  <option value="payment_issue">💳 ऑनलाइन भुगतान समस्या (Payment Issue)</option>
                  <option value="consultation_help">👨‍⚕️ वीडियो/ओपीडी परामर्श पूछ-ताछ (Consultation Help)</option>
                  <option value="general">❓ सामान्य प्रश्न (General Query)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  विषय / Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="उदा. मेरी बुकिंग रीशेड्यूल करनी है"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  संदेश विवरण / Message Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="अपनी समस्या का पूरा विवरण यहाँ लिखें..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span>सबमिट हो रहा है...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>सपोर्ट टिकट भेजें / Submit Ticket</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}

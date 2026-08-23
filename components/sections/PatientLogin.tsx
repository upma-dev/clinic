'use client';

import React, { useState } from 'react';
import { Phone, ArrowRight, User, CheckCircle2, Bell, CalendarClock, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface PatientLoginProps {
  onLogin: () => void;
}

export default function PatientLogin({ onLogin }: PatientLoginProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/patient/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: <Activity className="w-5 h-5 text-emerald-500" />,
      title: "Daily Skincare Routine",
      desc: "Track your morning and night routines, and build consistency."
    },
    {
      icon: <Bell className="w-5 h-5 text-blue-500" />,
      title: "Smart Reminders",
      desc: "Get notified when it's time to apply your treatments."
    },
    {
      icon: <CalendarClock className="w-5 h-5 text-amber-500" />,
      title: "Live Queue Updates",
      desc: "Check your live waitlist status and book arrival windows."
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Benefits */}
        <div className="md:w-5/12 bg-gradient-to-br from-primary/5 to-emerald-50/50 p-8 sm:p-10 border-r border-gray-100 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-6">
              Why join your Patient Portal?
            </h3>
            
            <div className="space-y-6">
              {benefits.map((b, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{b.title}</h4>
                    <p className="text-xs font-sans text-gray-600 leading-relaxed">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-10 p-4 bg-primary/10 rounded-2xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-primary">100% Free for Clinic Patients</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-7/12 p-8 sm:p-12 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="mb-8">
              <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-500 font-sans text-sm">Enter your mobile number to securely access your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    required
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="w-full pl-11 pr-4 py-3.5 bg-surface border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                    placeholder="+91 90000 00000"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-sans text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Name (Optional)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full pl-11 pr-4 py-3.5 bg-surface border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-semibold"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-4 bg-primary text-white rounded-2xl font-sans font-bold text-base hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-70 shadow-lg shadow-primary/30 hover:-translate-y-0.5"
              >
                {loading ? 'Accessing...' : 'Access My Account'}
                {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

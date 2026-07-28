'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, UserCircle, Activity, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AppointmentBookingView from './AppointmentBookingView';
import PatientLogin from './PatientLogin';
import DailyRoutineDashboard from './DailyRoutineDashboard';
import PatientPayments from './PatientPayments';

export default function PatientPortal() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'payments' | 'routine'>('appointments');
  const [patient, setPatient] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/patient/me');
        const data = await res.json();
        if (res.ok) setPatient(data.patient);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-surface" id="patient-portal">
      {/* Premium Glassmorphic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-gray-200 text-primary font-sans text-xs font-bold uppercase tracking-widest mb-4 shadow-sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Smart Patient Experience
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-playfair text-4xl sm:text-5xl font-black text-gray-900 tracking-tight"
          >
            Your Skin Health, <span className="text-primary italic">Managed</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="font-sans text-gray-600 mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            Book your arrival window, access bills, or manage your daily skincare routine all in one premium space.
          </motion.p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/50 shadow-lg flex flex-wrap justify-center gap-1">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'appointments' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Calendar className="w-4 h-4" /> Waitlist & Booking
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'payments' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <CreditCard className="w-4 h-4" /> My Invoices & Payments
            </button>
            <button
              onClick={() => setActiveTab('routine')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                activeTab === 'routine' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <UserCircle className="w-4 h-4" /> My Daily Routine
            </button>
          </div>
        </div>

        {/* Dynamic Content Rendering */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[500px]"
          >
            {activeTab === 'appointments' && (
              <AppointmentBookingView />
            )}
            
            {activeTab === 'payments' && (
              <div className="w-full">
                {loadingAuth ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : patient ? (
                  <PatientPayments patient={patient} />
                ) : (
                  <PatientLogin onLogin={() => {
                    // Refetch patient on login
                    fetch('/api/patient/me')
                      .then(r => r.json())
                      .then(d => { if (d.patient) setPatient(d.patient); });
                  }} />
                )}
              </div>
            )}

            {activeTab === 'routine' && (
              <div className="w-full">
                {loadingAuth ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : patient ? (
                  <DailyRoutineDashboard patient={patient} />
                ) : (
                  <PatientLogin onLogin={() => {
                    // Refetch patient on login
                    fetch('/api/patient/me')
                      .then(r => r.json())
                      .then(d => { if (d.patient) setPatient(d.patient); });
                  }} />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}

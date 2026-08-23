'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';
import AppointmentBookingView from './AppointmentBookingView';

export default function PatientPortal() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-surface" id="patient-portal">
      {/* Premium Glassmorphic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <motion.span 
            initial={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-gray-200 text-primary font-sans text-xs font-bold uppercase tracking-widest mb-4 shadow-sm"
          >
            <Activity className="w-4 h-4 mr-2 text-emerald-600" />
            Smart Patient Experience
          </motion.span>

          <motion.h2 
            initial={{ opacity: 1, y: 0 }}
            className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight"
          >
            Live Clinic Queue & <span className="text-primary italic">Patient Tokens</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 1, y: 0 }}
            className="font-sans text-gray-600 mt-3 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
          >
            Track real-time clinic status, current serving tokens, and live patient waitlist.
          </motion.p>
        </div>

        {/* Live Waitlist & Queue View */}
        <AppointmentBookingView />

      </div>
    </section>
  );
}

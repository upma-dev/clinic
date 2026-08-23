'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import clsx from 'clsx';

// Example props, you can pass these from the page component
interface PatientDashboardHeroProps {
  patientName?: string;
  completedSteps?: number;
  totalSteps?: number;
  nextAppointment?: string; // e.g., "Thu, 10 Jul, 5:30 PM"
}

export default function PatientDashboardHero({
  patientName = 'Riya',
  completedSteps = 3,
  totalSteps = 5,
  nextAppointment,
}: PatientDashboardHeroProps) {
  // We use local state to demonstrate the ring filling animation interaction
  // In a real app, this would be synced with the backend/global state
  const [currentCompleted, setCurrentCompleted] = useState(completedSteps);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const gap = 12; // Gap between segments
  const segmentLength = (circumference / totalSteps) - gap;
  
  // Calculate dasharray to only show one segment
  const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;

  const isAllDone = currentCompleted === totalSteps;
  const stepsLeft = totalSteps - currentCompleted;

  // Demo function to simulate checking off a step
  const handleSimulateCheckoff = () => {
    if (currentCompleted < totalSteps) {
      setCurrentCompleted(prev => prev + 1);
    }
  };

  return (
    <div className="w-full bg-[#FBF8F5] px-4 pt-8 pb-6 text-[#1F2A28] font-sans md:hidden">
      
      {/* 1. Top: Greeting */}
      <div className="mb-8">
        <p className="text-[14px] font-medium text-[#8A9490] font-sans">
          Good evening,
        </p>
        {/* Using standard sans as fallback for Sora, since layout.tsx doesn't load Sora yet */}
        <h1 className="text-3xl font-semibold mt-1 tracking-tight" style={{ fontFamily: 'var(--font-sans), sans-serif' }}>
          {patientName}
        </h1>
      </div>

      <div className="flex items-center gap-6 mb-8">
        {/* 2. Center-left: Circular progress ring */}
        <div 
          className="relative w-[130px] h-[130px] flex-shrink-0 cursor-pointer" 
          onClick={handleSimulateCheckoff}
          title="Tap to simulate completing a step"
        >
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 130 130">
            {/* Render background segments */}
            {Array.from({ length: totalSteps }).map((_, i) => (
              <circle
                key={`bg-${i}`}
                cx="65"
                cy="65"
                r={radius}
                fill="none"
                stroke="#E9EAE8" // Muted background track
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={0}
                style={{
                  transformOrigin: '50% 50%',
                  transform: `rotate(${i * (360 / totalSteps)}deg)`,
                }}
              />
            ))}

            {/* Render filled segments */}
            {Array.from({ length: totalSteps }).map((_, i) => {
              const isFilled = i < currentCompleted;
              return (
                <motion.circle
                  key={`fill-${i}`}
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="none"
                  stroke="#4C9A6A" // Success Green
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ 
                    strokeDashoffset: isFilled ? 0 : circumference 
                  }}
                  transition={{ 
                    duration: 0.6, 
                    ease: "easeOut",
                    delay: isFilled ? i * 0.1 : 0 // slight stagger for initial load
                  }}
                  style={{
                    transformOrigin: '50% 50%',
                    transform: `rotate(${i * (360 / totalSteps)}deg)`,
                  }}
                />
              );
            })}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-[#2F5D50] leading-none mb-1">
              {currentCompleted}<span className="text-xl text-[#8A9490]">/{totalSteps}</span>
            </span>
          </div>
        </div>

        {/* 3. Right of ring: Status text */}
        <div className="flex-1">
          {isAllDone ? (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#4C9A6A] font-semibold text-[15px] leading-snug flex items-center gap-1.5"
            >
              All done today
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              key="pending-text"
              className="text-[#E8A15D] font-semibold text-[15px] leading-snug"
            >
              {stepsLeft} {stepsLeft === 1 ? 'step' : 'steps'} left before bed
            </motion.div>
          )}
        </div>
      </div>

      {/* 4. Below ring: Horizontal Card */}
      <div>
        {nextAppointment ? (
          <div className="flex items-center justify-between p-4 bg-white rounded-[18px] border border-[#8A9490]/20 active:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-wider text-[#8A9490] uppercase mb-1">
                Next Appointment
              </span>
              <span className="text-[14px] font-semibold text-[#1F2A28]">
                {nextAppointment}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#FBF8F5] flex items-center justify-center text-[#8A9490]">
              <ChevronRight size={18} strokeWidth={2} />
            </div>
          </div>
        ) : (
          <button className="w-full flex items-center justify-center gap-2 p-4 bg-[#E8A15D] text-white rounded-[18px] font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-sm">
            <CalendarPlus size={18} strokeWidth={2.5} />
            Book Consultation
          </button>
        )}
      </div>

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Check, Flame, Plus, Activity, Moon, Sun, Trash2, Clock } from 'lucide-react';
import RoutineBuilder from './RoutineBuilder';
import { motion, AnimatePresence } from 'motion/react';
import type { Routine, RoutineLog } from '@/lib/db/routines';
import { initNotifications, requestNotificationPermission } from '@/lib/notifications';

interface DailyRoutineDashboardProps {
  patient: any;
}

export default function DailyRoutineDashboard({ patient }: DailyRoutineDashboardProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/routines?date=${today}`);
      const data = await res.json();
      if (res.ok) {
        setRoutines(data.routines);
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (routines.length > 0) {
      initNotifications(routines);
    }
  }, [routines]);

  const toggleRoutine = async (id: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Optimistic UI update
      const isCompleted = logs.some(l => l.routineId === id);
      if (isCompleted) {
        setLogs(logs.filter(l => l.routineId !== id));
      } else {
        setLogs([...logs, { id: 'temp', patientId: patient.id, routineId: id, date: today, completedAt: new Date().toISOString() }]);
      }

      await fetch(`/api/routines/${id}/log`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      });
      fetchData(); // Sync with server
    } catch (error) {
      console.error('Failed to toggle', error);
      fetchData(); // Revert on failure
    }
  };

  const deleteRoutine = async (id: string) => {
    if (!confirm('Delete this routine?')) return;
    try {
      await fetch(`/api/routines/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const completedCount = logs.length;
  const totalCount = routines.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Group by time
  const morningRoutines = routines.filter(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 4 && hour < 16;
  });
  
  const nightRoutines = routines.filter(r => {
    const hour = parseInt(r.time.split(':')[0]);
    return hour >= 16 || hour < 4;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Progress & Stats Card */}
      <div className="bg-gradient-to-br from-primary to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 blur-3xl rounded-full"></div>
        
        <div className="z-10 text-center sm:text-left">
          <h2 className="font-playfair text-2xl font-bold mb-1">Your Daily Routine</h2>
          <p className="text-primary-foreground/80 text-sm font-sans">Consistency is the key to healthy skin.</p>
        </div>

        <div className="flex gap-4 z-10 w-full sm:w-auto">
          {/* Progress */}
          <div className="flex-1 sm:flex-none bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/20" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white transition-all duration-1000 ease-out" strokeDasharray={`${progressPercent * 1.25} 125`} />
              </svg>
              <span className="absolute text-[10px] font-bold">{progressPercent}%</span>
            </div>
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider font-bold">Today</p>
              <p className="text-xl font-black">{completedCount} <span className="text-sm text-white/70 font-normal">/ {totalCount}</span></p>
            </div>
          </div>

          {/* Streaks */}
          <div className="flex-1 sm:flex-none bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-[10px] text-white/70 uppercase tracking-wider font-bold">Streak</p>
                <p className="text-xl font-black">3 <span className="text-xs text-white/70 font-normal">Days</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Routine Timeline */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-playfair text-2xl font-bold text-gray-900">Today's Schedule</h3>
          <button 
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold text-sm rounded-full hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading routine...</div>
        ) : routines.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-gray-200 rounded-2xl">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold mb-4">You haven't set up your skincare routine yet.</p>
            <button onClick={() => setShowBuilder(true)} className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform">
              Build My Routine
            </button>
          </div>
        ) : (
          <div className="space-y-10 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
            
            {/* Morning Section */}
            {morningRoutines.length > 0 && (
              <div className="relative">
                <div className="flex items-center gap-4 mb-6 relative z-10 md:justify-center">
                  <div className="bg-amber-100 p-2 rounded-full ring-4 ring-white"><Sun className="w-5 h-5 text-amber-600" /></div>
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider text-sm md:w-32 md:text-center">Morning</h4>
                </div>
                <div className="space-y-4">
                  {morningRoutines.map(r => (
                    <RoutineItem key={r.id} routine={r} isCompleted={logs.some(l => l.routineId === r.id)} onToggle={toggleRoutine} onDelete={deleteRoutine} />
                  ))}
                </div>
              </div>
            )}

            {/* Night Section */}
            {nightRoutines.length > 0 && (
              <div className="relative pt-6">
                <div className="flex items-center gap-4 mb-6 relative z-10 md:justify-center">
                  <div className="bg-indigo-100 p-2 rounded-full ring-4 ring-white"><Moon className="w-5 h-5 text-indigo-600" /></div>
                  <h4 className="font-bold text-gray-900 uppercase tracking-wider text-sm md:w-32 md:text-center">Night</h4>
                </div>
                <div className="space-y-4">
                  {nightRoutines.map(r => (
                    <RoutineItem key={r.id} routine={r} isCompleted={logs.some(l => l.routineId === r.id)} onToggle={toggleRoutine} onDelete={deleteRoutine} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showBuilder && <RoutineBuilder onAdd={() => { setShowBuilder(false); fetchData(); }} onClose={() => setShowBuilder(false)} />}
    </div>
  );
}

function RoutineItem({ routine, isCompleted, onToggle, onDelete }: { routine: Routine, isCompleted: boolean, onToggle: (id: string) => void, onDelete: (id: string) => void }) {
  // Convert 24h to 12h
  const timeFormatted = new Date(`2000-01-01T${routine.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative z-10 flex items-center gap-4 p-4 rounded-2xl border transition-all ${isCompleted ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'}`}
    >
      <button 
        onClick={() => onToggle(routine.id)}
        className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-transparent hover:border-primary'}`}
      >
        <Check className="w-4 h-4" />
      </button>
      
      <div className="flex-grow">
        <h5 className={`font-bold text-base transition-colors ${isCompleted ? 'text-gray-400 line-through decoration-emerald-300' : 'text-gray-900'}`}>{routine.name}</h5>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">{routine.category}</span>
          <span className="text-xs text-gray-500 font-semibold flex items-center"><Clock className="w-3 h-3 mr-1" /> {timeFormatted}</span>
        </div>
        {routine.notes && <p className="text-xs text-gray-500 mt-2 italic">{routine.notes}</p>}
      </div>

      <button onClick={() => onDelete(routine.id)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

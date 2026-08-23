'use client';

import React, { useState } from 'react';
import { Plus, X, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface RoutineBuilderProps {
  onAdd: () => void;
  onClose: () => void;
}

export default function RoutineBuilder({ onAdd, onClose }: RoutineBuilderProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Skincare',
    time: '08:00',
    repeat: 'Daily',
    notes: '',
    reminderEnabled: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onAdd();
    } catch (err: any) {
      setError(err.message || 'Failed to add routine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="font-playfair text-xl font-bold text-gray-900">Add New Routine</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 text-gray-500 hover:text-gray-900 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">Routine Name *</label>
            <input 
              required
              type="text" 
              name="name"
              value={formData.name} 
              onChange={handleChange} 
              className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none font-semibold"
              placeholder="e.g. Vitamin C Serum"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
              <select 
                name="category"
                value={formData.category} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none font-semibold"
              >
                <option value="Skincare">Skincare</option>
                <option value="Medicine">Medicine</option>
                <option value="Water">Water</option>
                <option value="Exercise">Exercise</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  required
                  type="time" 
                  name="time"
                  value={formData.time} 
                  onChange={handleChange} 
                  className="w-full pl-9 pr-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">Repeat</label>
            <select 
              name="repeat"
              value={formData.repeat} 
              onChange={handleChange} 
              className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none font-semibold"
            >
              <option value="Daily">Daily</option>
              <option value="Weekdays">Weekdays</option>
              <option value="Weekends">Weekends</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-sans text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes (Optional)</label>
            <input 
              type="text" 
              name="notes"
              value={formData.notes} 
              onChange={handleChange} 
              className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none font-semibold"
              placeholder="e.g. After washing face"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="font-sans text-sm font-bold text-gray-700">Enable Notification Reminder</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="reminderEnabled" checked={formData.reminderEnabled} onChange={handleChange} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-4 bg-primary text-white rounded-xl font-sans font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-70"
          >
            {loading ? 'Saving...' : 'Save Routine'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, User, Phone, Mail, MapPin, 
  FileText, Pill, StickyNote, AlertCircle, CheckCircle2, 
  Activity, Video, Building2, Sparkles
} from 'lucide-react';
import type { Booking, SlotAvailability } from '@/lib/types';

interface RescheduleModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (res?: any) => void;
}

export default function RescheduleModal({
  booking,
  isOpen,
  onClose,
  onSuccess
}: RescheduleModalProps) {
  if (!isOpen || !booking) return null;

  const [name, setName] = useState(booking.name || '');
  const [phone, setPhone] = useState(booking.phone || '');
  const [email, setEmail] = useState(booking.email || '');
  const [service, setService] = useState(booking.service || 'General Consultation');
  const [gender, setGender] = useState(booking.gender || 'Male');
  const [age, setAge] = useState(booking.age ? String(booking.age) : '');
  const [address, setAddress] = useState(booking.address || '');
  const [skinType, setSkinType] = useState(booking.skinType || 'Normal');
  const [problemDescription, setProblemDescription] = useState(booking.problemDescription || '');
  const [previousMedication, setPreviousMedication] = useState(booking.previousMedication || '');
  const [appointmentNotes, setAppointmentNotes] = useState(booking.appointmentNotes || '');
  const [bookingType, setBookingType] = useState<'online' | 'offline'>(
    booking.bookingType === 'online' ? 'online' : 'offline'
  );
  
  const [date, setDate] = useState(booking.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(booking.time || '');
  const [reason, setReason] = useState(booking.rescheduleReason || 'Patient requested schedule adjustment');

  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const minDate = new Date().toISOString().split('T')[0];

  // Fetch slots whenever date or bookingType changes
  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    fetch(`/api/appointments/slots?date=${date}&type=${bookingType}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.slots) {
          setSlots(data.slots);
        }
      })
      .catch((err) => console.error('Failed to load slots for reschedule:', err))
      .finally(() => setLoadingSlots(false));
  }, [date, bookingType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!date || !time) {
      setError('Please select a date and an available time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: booking.id,
          action: 'reschedule',
          newDate: date,
          newTime: time,
          reason,
          name,
          phone,
          email,
          service,
          gender,
          age: age ? Number(age) : undefined,
          address,
          skinType: bookingType === 'online' ? skinType : undefined,
          problemDescription,
          previousMedication,
          appointmentNotes,
          bookingType,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409 || data.error?.includes('already booked')) {
          throw new Error(data.error || 'Yeh time slot pehle se booked hai. Kripya dusra slot chunein.');
        }
        throw new Error(data.error || 'Failed to reschedule appointment');
      }

      setSuccessMsg('Appointment successfully rescheduled!');
      setTimeout(() => {
        onSuccess(data);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'An error occurred during reschedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs overflow-y-auto pt-4 pb-10 px-3 sm:px-6 flex items-start justify-center select-text">
      <div className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl border border-gray-200 overflow-hidden relative animate-[fadeIn_0.15s_ease-out] my-auto">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] p-5 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-teal-300 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-playfair text-lg sm:text-xl font-bold tracking-tight">
                  Reschedule Appointment
                </h3>
                <span className="font-mono text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  #{booking.id}
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Current: <strong className="text-white">{booking.date} at {booking.time}</strong> • {booking.service}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FORM */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto text-left">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs font-bold animate-bounce">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {booking.status === 'no-show' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs font-semibold">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Yeh patient <strong>Skipped / No-Show</strong> mark ho gaya tha. Queue lobby me wapas re-add karne ke liye kripya niche ek available time slot chunein taaki koi slot conflict na ho.
              </span>
            </div>
          )}

          {/* SECTION 1: TARGET DATE & LIVE TIME SLOTS */}
          <div className="p-5 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100/80 pb-3">
              <h4 className="text-xs font-black text-[#1B4F72] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                Select New Consultation Slot *
              </h4>

              {/* Consultation Type switch */}
              <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setBookingType('offline')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    bookingType === 'offline' ? 'bg-[#1B4F72] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🏥 Clinic Visit
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType('online')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    bookingType === 'online' ? 'bg-[#1B4F72] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🌐 Online Video
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">
                  New Appointment Date *
                </label>
                <input
                  required
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime(''); // Reset time on date change to pick from available
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">
                    Available Time Slots for {date} *
                  </label>
                  {loadingSlots && (
                    <span className="text-[10px] text-primary font-bold animate-pulse">Loading live slots...</span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-center text-xs text-gray-400 font-semibold animate-pulse">
                    Fetching real-time slots...
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-center text-xs text-gray-500 font-semibold">
                    No slots generated for this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded-xl border border-gray-200">
                    {slots.map((s) => {
                      const isSelected = time === s.time;
                      const isFree = s.status === 'available' || (s.time === booking.time && date === booking.date);
                      return (
                        <button
                          key={s.time}
                          type="button"
                          disabled={!isFree}
                          onClick={() => setTime(s.time)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-primary text-white border-primary ring-2 ring-primary/20 shadow-xs'
                              : isFree
                              ? 'bg-emerald-50/40 text-emerald-950 border-emerald-200 hover:bg-emerald-100/70'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through opacity-60'
                          }`}
                        >
                          {s.time}
                        </button>
                      );
                    })}
                  </div>
                )}
                {time && (
                  <p className="text-[11px] font-bold text-emerald-700 pl-1">
                    ✓ Selected Slot: <strong>{time}</strong> on <strong>{date}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: PATIENT PERSONAL DETAILS */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <User className="w-4 h-4 text-teal-600" />
              Patient Personal Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Patient Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 28"
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Address / City</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ujjain, MP"
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CLINICAL DETAILS & REASON */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Treatment & Clinical Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Treatment / Service *</label>
                <input
                  required
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Skin Type</label>
                <select
                  value={skinType}
                  onChange={(e) => setSkinType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                >
                  <option>Normal</option>
                  <option>Oily</option>
                  <option>Dry</option>
                  <option>Combination</option>
                  <option>Sensitive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Problem / Symptoms</label>
                <textarea
                  rows={2}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Acne, pigmentation, rash, duration..."
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Previous Medication</label>
                <textarea
                  rows={2}
                  value={previousMedication}
                  onChange={(e) => setPreviousMedication(e.target.value)}
                  placeholder="Past creams, treatments, prescriptions..."
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Doctor / Clinic Notes</label>
                <input
                  type="text"
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="Internal notes for this visit..."
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-0.5">Reschedule Reason *</label>
                <input
                  required
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Patient request / Doctor schedule change"
                  className="w-full px-3 py-2 bg-gray-50/60 focus:bg-white border border-gray-250 rounded-xl text-xs font-semibold outline-none"
                />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500 font-medium">
              Updating will modify the appointment slot and patient records in the database.
            </p>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !time || loadingSlots}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#1B4F72] hover:bg-[#0B1B29] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> {booking.status === 'no-show' ? 'Reschedule & Re-add to Queue' : 'Confirm Reschedule & Save'}
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

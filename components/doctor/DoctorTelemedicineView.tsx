'use client';

import React, { useState, useEffect } from 'react';
import { Video, Clock, ChevronRight } from 'lucide-react';
import DigitalPatientCaseFile from './DigitalPatientCaseFile';

export default function DoctorTelemedicineView() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Fetching all for now. In production, we'd filter by today's date.
      const res = await fetch('/api/telemedicine/staff/manage?status=all');
      const data = await res.json();
      const relevant = (data.appointments || []).filter((a: any) => ['pending', 'pending_staff_review', 'confirmed', 'completed'].includes(a.status));
      setAppointments(relevant);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  if (selectedAppointment) {
    return (
      <DigitalPatientCaseFile 
        appointment={selectedAppointment} 
        onBack={() => {
          setSelectedAppointment(null);
          fetchAppointments();
        }} 
      />
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden min-h-[500px]">
      <div className="bg-gradient-to-r from-primary to-blue-700 p-6 text-white">
        <h2 className="font-playfair text-2xl font-bold flex items-center gap-2">
          <Video className="w-6 h-6" /> Today's Online Consultations
        </h2>
        <p className="text-blue-100 text-sm mt-1">Select a patient to open their Digital Case File.</p>
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading consultations...</p>
        ) : appointments.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No consultations for today.</p>
        ) : (
          <div className="space-y-4">
            {appointments.map(apt => (
              <div 
                key={apt._id} 
                onClick={() => setSelectedAppointment(apt)}
                className="p-5 border border-gray-100 rounded-2xl bg-surface hover:bg-gray-50 hover:border-primary/30 transition-all cursor-pointer flex justify-between items-center group shadow-sm hover:shadow-md"
              >
                <div>
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    {apt.name}
                    {apt.status === 'completed' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">Completed</span>}
                    {apt.status === 'confirmed' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">Scheduled</span>}
                    {(apt.status === 'pending_staff_review' || apt.status === 'pending') && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">New Request</span>}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {apt.preferredDate} ({apt.preferredTimeSlot})
                  </p>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-1 border-l-2 border-gray-300 pl-2">
                    {apt.chiefComplaint}
                  </p>
                </div>
                <div className="text-primary opacity-50 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

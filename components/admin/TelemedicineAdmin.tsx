'use client';

import React, { useState, useEffect } from 'react';
import { Video, CheckCircle2, XCircle, Clock, Calendar, Search } from 'lucide-react';

export default function TelemedicineAdmin() {
  const [activeTab, setActiveTab] = useState('pending');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telemedicine/staff/manage?status=${activeTab}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  const handleAction = async (id: string, action: 'confirm' | 'cancel', apt: any) => {
    if (!confirm(`Are you sure you want to ${action} this appointment?`)) return;
    
    setActionLoading(id);
    try {
      const res = await fetch('/api/telemedicine/staff/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          appointmentId: id,
          patientName: apt.name,
          email: apt.email,
          date: apt.preferredDate,
          time: apt.preferredTimeSlot
        })
      });

      if (res.ok) {
        alert(`Appointment ${action}ed successfully.`);
        fetchAppointments();
      } else {
        alert('Action failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-emerald-600 p-6 sm:px-8 text-white flex justify-between items-center">
        <div>
          <h2 className="font-playfair text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" /> Online Consultations
          </h2>
          <p className="text-emerald-100 text-sm mt-1">Manage telemedicine requests</p>
        </div>
      </div>

      <div className="p-4 sm:px-8 border-b border-gray-100 flex gap-4 overflow-x-auto">
        {['pending', 'confirmed', 'completed', 'cancelled'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-bold text-sm rounded-full capitalize whitespace-nowrap transition-colors ${
              activeTab === tab ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 sm:px-8 bg-surface min-h-[400px]">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No {activeTab} consultations found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appointments.map(apt => (
              <div key={apt._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{apt.name}</h3>
                    <p className="text-xs text-gray-500">{apt.phone} • {apt.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    apt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
                
                <div className="text-xs space-y-1 mb-4 text-gray-600">
                  <p><strong>Age/Gender:</strong> {apt.age} / {apt.gender}</p>
                  <p><strong>City:</strong> {apt.city}, {apt.state}</p>
                  <p className="text-primary font-semibold flex items-center gap-1 mt-2">
                    <Clock className="w-3 h-3" /> {apt.preferredDate} ({apt.preferredTimeSlot})
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
                  <p className="text-xs text-gray-800 line-clamp-3"><strong>Complaint:</strong> {apt.chiefComplaint}</p>
                </div>

                {activeTab === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAction(apt._id, 'confirm', apt)}
                      disabled={actionLoading === apt._id}
                      className="flex-1 bg-primary text-white font-bold text-xs py-2 rounded-xl hover:bg-emerald-600 transition-colors"
                    >
                      {actionLoading === apt._id ? 'Processing...' : 'Confirm & Generate Link'}
                    </button>
                    <button 
                      onClick={() => handleAction(apt._id, 'cancel', apt)}
                      disabled={actionLoading === apt._id}
                      className="px-3 bg-red-50 text-red-600 font-bold text-xs py-2 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {activeTab === 'confirmed' && apt.meetingUrl && (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                    <p className="text-[10px] text-emerald-800 font-bold uppercase mb-1">Meeting Link Generated</p>
                    <a href={apt.meetingUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                      {apt.meetingUrl}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

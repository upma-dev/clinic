'use client';

import React, { useState, useEffect } from 'react';
import { 
  Video, Clock, ChevronRight, FileText, CheckCircle, Search, RefreshCw, 
  Phone, MessageCircle, Calendar, List, LayoutGrid, AlertCircle, Eye
} from 'lucide-react';
import DigitalPatientCaseFile from './DigitalPatientCaseFile';

type StageTab = 'pending' | 'confirmed' | 'completed' | 'all';

interface Props {
  initialStage?: StageTab;
  onStageChange?: (stage: StageTab) => void;
}

export default function DoctorTelemedicineView({ initialStage = 'confirmed', onStageChange }: Props) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<StageTab>(initialStage);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  useEffect(() => {
    if (initialStage) {
      setActiveStage(initialStage);
    }
  }, [initialStage]);

  const handleStageSwitch = (stage: StageTab) => {
    setActiveStage(stage);
    if (onStageChange) {
      onStageChange(stage);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/telemedicine/staff/manage?status=all');
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
  }, []);

  const handleConfirm = async (apt: any) => {
    try {
      await fetch('/api/telemedicine/staff/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          appointmentId: apt._id,
          patientName: apt.name,
          email: apt.email,
          date: apt.preferredDate,
          time: apt.preferredTimeSlot
        })
      });
      fetchAppointments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinMeeting = (apt: any) => {
    let url = apt.meetingUrl;
    if (!url) {
      const sanitizedName = (apt.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '');
      const roomName = `SkinHub-Consult-${sanitizedName}-${(apt._id || 'room').toString().substring(0, 8)}`;
      url = `https://meet.jit.si/${roomName}`;
      
      fetch('/api/telemedicine/staff/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          appointmentId: apt._id,
          patientName: apt.name,
          email: apt.email
        })
      }).catch(console.error);
    }
    window.open(url, '_blank');
  };

  const handleWhatsAppContact = (apt: any) => {
    const meetingUrl = apt.meetingUrl || `https://meet.jit.si/SkinHub-Consult-${(apt.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '')}-${(apt._id || 'room').toString().substring(0, 8)}`;
    const msg = `*Skin Hub Clinic — Online Video Consultation* 🏥\n\nHello ${apt.name},\n\nThis is Dr. Prateek Tiwari from Skin Hub Clinic. Your online video consultation is scheduled for *${apt.preferredDate}* at *${apt.preferredTimeSlot}*.\n\n📹 *Video Meeting Link:* ${meetingUrl}\n\nPlease click the link to join your video consultation session.`;
    const cleanPhone = (apt.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

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

  // Filter appointments by stage & search query
  const filtered = appointments.filter((apt) => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchName = apt.name?.toLowerCase().includes(query);
      const matchPhone = apt.phone?.includes(query);
      const matchComplaint = apt.chiefComplaint?.toLowerCase().includes(query);
      if (!matchName && !matchPhone && !matchComplaint) return false;
    }

    if (activeStage === 'pending') return apt.status === 'pending' || apt.status === 'pending_staff_review';
    if (activeStage === 'confirmed') return apt.status === 'confirmed';
    if (activeStage === 'completed') return apt.status === 'completed';
    return true; // 'all'
  });

  const pendingCount = appointments.filter(a => a.status === 'pending' || a.status === 'pending_staff_review').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const totalCount = appointments.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-0 w-full">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#0B1B29] to-[#1B4F72] p-6 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-playfair text-2xl font-bold flex items-center gap-3">
            <Video className="w-6 h-6 text-emerald-400" /> Online Video Consultations
          </h2>
          <p className="text-gray-300 text-xs mt-1">
            Manage online video appointments, view pre-consultation questionnaires, contact patients via WhatsApp/Phone, and issue prescriptions.
          </p>
        </div>

        <button
          onClick={fetchAppointments}
          disabled={loading}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Sub-bar / Stage Navigation Tabs & Controls */}
      <div className="bg-surface p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          
          <button
            onClick={() => handleStageSwitch('confirmed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeStage === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            📅 Confirmed & Scheduled
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeStage === 'confirmed' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {confirmedCount}
            </span>
          </button>

          <button
            onClick={() => handleStageSwitch('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeStage === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            ⏳ Pending Review
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeStage === 'pending' ? 'bg-white text-amber-700' : 'bg-amber-500 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleStageSwitch('completed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeStage === 'completed'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✅ Completed & Prescribed
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeStage === 'completed' ? 'bg-white text-primary' : 'bg-blue-100 text-primary'
            }`}>
              {completedCount}
            </span>
          </button>

          <button
            onClick={() => handleStageSwitch('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeStage === 'all'
                ? 'bg-gray-800 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            📋 All Records ({totalCount})
          </button>

        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search patient, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary w-full sm:w-52"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-primary shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-primary shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
          </div>
        </div>
      </div>

      {/* Main List Workspace */}
      <div className="p-6 bg-gray-50/50 min-h-[450px]">
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-xs font-semibold">Loading consultations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-bold text-gray-700">No {activeStage} consultations found.</p>
            <p className="text-xs text-gray-400 mt-1">Select a different tab or search above.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* DATA TABLE LIST VIEW */
          <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Patient Name & Info</th>
                  <th className="py-3.5 px-4">Doctor Contact Actions</th>
                  <th className="py-3.5 px-4">Date & Time Slot</th>
                  <th className="py-3.5 px-4">Chief Complaint</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Consultation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filtered.map((apt) => (
                  <tr key={apt._id} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* Patient Name & Details */}
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <div className="font-bold text-gray-900 text-sm">{apt.name}</div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                        {apt.age} {apt.gender} • {apt.city}
                      </div>
                    </td>

                    {/* Contact Doctor Actions (Phone + WhatsApp) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${apt.phone}`}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                          title="Call Patient"
                        >
                          <Phone className="w-3 h-3" /> {apt.phone}
                        </a>
                        <button
                          onClick={() => handleWhatsAppContact(apt)}
                          className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Contact via WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </button>
                      </div>
                    </td>

                    {/* Date & Time Slot */}
                    <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      <div className="text-gray-900">{apt.preferredDate}</div>
                      <div className="text-[11px] text-primary font-bold">{apt.preferredTimeSlot}</div>
                    </td>

                    {/* Chief Complaint */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-gray-800 font-semibold line-clamp-2">{apt.chiefComplaint}</p>
                      {apt.symptomsDuration && (
                        <span className="text-[10px] text-gray-500 italic block mt-0.5">Duration: {apt.symptomsDuration}</span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] uppercase">
                        {apt.paymentStatus === 'paid' ? '₹600 Paid' : 'Pending'}
                      </span>
                    </td>

                    {/* Stage Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {apt.status === 'completed' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-black uppercase">
                          Completed
                        </span>
                      )}
                      {apt.status === 'confirmed' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-black uppercase">
                          Confirmed
                        </span>
                      )}
                      {(apt.status === 'pending_staff_review' || apt.status === 'pending') && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-black uppercase">
                          Pending Review
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {(apt.status === 'pending' || apt.status === 'pending_staff_review') && (
                          <button
                            onClick={() => handleConfirm(apt)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" /> Confirm
                          </button>
                        )}

                        {apt.status !== 'completed' && (
                          <button
                            onClick={() => handleJoinMeeting(apt)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Video className="w-3 h-3" /> Join Video Call
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedAppointment(apt)}
                          className="px-2.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Case File & PDF
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* CARDS GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((apt) => (
              <div
                key={apt._id}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{apt.name}</h3>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">
                        {apt.age} {apt.gender} • {apt.city}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black uppercase">
                      {apt.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                    <span className="text-primary font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {apt.preferredDate} ({apt.preferredTimeSlot})
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      ₹600 Paid
                    </span>
                  </div>

                  <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100 text-xs">
                    <p className="text-[10px] uppercase font-black text-amber-800">Chief Complaint:</p>
                    <p className="text-gray-800 font-semibold">{apt.chiefComplaint}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-150 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleWhatsAppContact(apt)}
                    className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleJoinMeeting(apt)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Video className="w-3.5 h-3.5" /> Join Call
                    </button>

                    <button
                      onClick={() => setSelectedAppointment(apt)}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" /> Case File
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

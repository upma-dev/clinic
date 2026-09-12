'use client';

import React, { useState, useEffect } from 'react';
import { Video, CheckCircle2, XCircle, Clock, Calendar, Search } from 'lucide-react';

interface TelemedicineAdminProps {
  role?: 'staff' | 'doctor';
}

export default function TelemedicineAdmin({ role = 'staff' }: TelemedicineAdminProps) {
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

  const handleAction = async (id: string, action: 'confirm' | 'cancel' | 'complete' | 'check-payment-db', apt: any) => {
    if (action !== 'check-payment-db') {
      if (!confirm(`Are you sure you want to ${action} this appointment?`)) return;
    }
    
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
        const resultData = await res.json();
        if (action === 'check-payment-db') {
          if (resultData.paid) {
            alert('Payment verified successfully! Slot confirmed and meeting details generated.');
            fetchAppointments();
          } else {
            alert(`Payment not yet completed. Status: ${resultData.paymentStatus || 'unpaid'}`);
          }
        } else if (action === 'confirm' && resultData.whatsappUrl) {
          window.open(resultData.whatsappUrl, '_blank');
          alert('Payment link generated! WhatsApp message window opened.');
          fetchAppointments();
        } else {
          alert(`Appointment marked as ${action === 'complete' ? 'completed' : action + 'ed'} successfully.`);
          fetchAppointments();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Action failed.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 select-text">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-250/60 max-w-lg">
        {['pending', 'confirmed', 'completed', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); fetchAppointments(); }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl uppercase tracking-wider transition-all select-none cursor-pointer ${
              activeTab === tab 
                ? 'bg-white text-primary shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab === 'pending' ? 'Pending Approval' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 font-bold text-xs">Loading consultations...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center text-gray-500 text-xs font-bold">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No {activeTab} consultations found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map(apt => (
            <div key={apt._id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-base truncate">{apt.name}</h3>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                      <span className="font-semibold text-gray-700 shrink-0">{apt.phone}</span>
                      {apt.email && (
                        <span className="text-gray-400 font-normal truncate max-w-[160px] sm:max-w-xs break-all">
                          • {apt.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                    (apt.status === 'pending' || apt.status === 'pending_staff_review') ? 'bg-amber-100 text-amber-700' :
                    apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {apt.status === 'pending_staff_review' ? 'pending' : apt.status}
                  </span>
                </div>
              
              <div className="text-xs space-y-1 mb-4 text-gray-600">
                <p><strong>Age/Gender:</strong> {apt.age} / {apt.gender}</p>
                <p><strong>Address:</strong> {apt.city}{apt.state ? `, ${apt.state}` : ''}</p>
                <p className="text-primary font-semibold flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3" /> {apt.preferredDate} ({apt.preferredTimeSlot})
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
                <p className="text-xs text-gray-800 line-clamp-3"><strong>Service:</strong> {apt.service || 'Online Video Consultation'}</p>
              </div>
            </div>

              {activeTab === 'pending' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAction(apt._id, 'confirm', apt)}
                      disabled={actionLoading === apt._id}
                      className="flex-1 bg-primary text-white font-bold text-xs py-2 rounded-xl hover:bg-emerald-600 transition-colors uppercase tracking-wider"
                    >
                      {actionLoading === apt._id ? 'Processing...' : (apt.razorpayPaymentLinkId ? 'Resend Payment Link' : 'Confirm & Send Link')}
                    </button>
                    
                    {String(apt.paymentStatus || '').toLowerCase() !== 'paid' && apt.razorpayPaymentLinkId && (
                      <button 
                        onClick={() => handleAction(apt._id, 'check-payment-db', apt)}
                        disabled={actionLoading === apt._id}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded-xl transition-colors uppercase tracking-wider"
                      >
                        Check Payment
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => handleAction(apt._id, 'cancel', apt)}
                    disabled={actionLoading === apt._id}
                    className="w-full bg-red-50 text-red-600 font-bold text-xs py-2 rounded-xl hover:bg-red-100 transition-colors uppercase tracking-wider"
                  >
                    Cancel Consultation Request
                  </button>
                </div>
              )}

              {activeTab === 'confirmed' && (
                <div className="space-y-3">
                  {apt.meetingUrl && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <p className="text-[10px] text-emerald-800 font-bold uppercase mb-1">Meeting Link Generated</p>
                      <span className="text-xs text-primary font-mono break-all">
                        {apt.meetingUrl}
                      </span>
                    </div>
                  )}

                  {role === 'doctor' ? (
                    <>
                      <div className="flex gap-2">
                        <a 
                          href={apt.meetingUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex-1 bg-blue-650 hover:bg-blue-750 text-white font-bold text-[10px] py-2 rounded-xl text-center block uppercase tracking-wider transition-colors"
                        >
                          Join Meeting
                        </a>
                        <button 
                          onClick={async () => {
                            const clinicName = 'Skin Hub Clinic';
                            const msg = `*🌟 ${clinicName} — Online Video Consultation Link 🎥*\n\nNamaste *${apt.name}*! 🙏\n\nAapki video consultation confirm ho gayi hai. Niche diye gaye link par click karke join karein:\n\n🔗 *Meeting Link:* ${apt.meetingUrl}\n• *Date:* ${apt.preferredDate}\n• *Time:* ${apt.preferredTimeSlot}\n\nKripya scheduled time se 5 min pehle link par click karke join karein.\n\nAapki skin health hamari priority hai! 💖\nDhanyawad! 🙏`;
                            const cleanPhone = (apt.phone || '').replace(/\D/g, '');
                            const waUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(msg)}`;
                            window.open(waUrl, '_blank');

                            // Mark meeting link as sent in DB
                            try {
                              await fetch('/api/telemedicine/staff/manage', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'mark-link-sent',
                                  appointmentId: apt._id,
                                })
                              });
                              fetchAppointments();
                            } catch (err) {
                              console.error('Failed to mark link as sent:', err);
                            }
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] py-2 rounded-xl text-center uppercase tracking-wider transition-colors"
                        >
                          Send Link
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {apt.meetingLinkSent ? (
                          <button 
                            onClick={() => handleAction(apt._id, 'complete', apt)}
                            disabled={actionLoading === apt._id}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] py-2 rounded-xl transition-colors uppercase tracking-wider"
                          >
                            {actionLoading === apt._id ? '...' : 'Complete'}
                          </button>
                        ) : (
                          <div className="flex-1 text-center py-2.5 text-[9px] font-bold text-amber-600 bg-amber-50 rounded-xl border border-amber-100 uppercase tracking-wider select-none">
                            Send Link First
                          </div>
                        )}
                        <button 
                          onClick={() => handleAction(apt._id, 'cancel', apt)}
                          disabled={actionLoading === apt._id}
                          className="px-3 bg-red-50 text-red-600 font-bold text-[10px] py-2 rounded-xl hover:bg-red-100 transition-colors uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-center space-y-1">
                      <p className="text-xs font-bold text-blue-950 uppercase tracking-wider">📹 Call & Prescription Managed by Doctor</p>
                      <p className="text-[10px] text-blue-700 font-medium">Slot is confirmed. Doctor will initiate Google Meet call and issue prescription pad.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'completed' && (
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      const clinicName = 'Skin Hub Clinic';
                      const msg = `*💖 ${clinicName} — Thank You for Visiting! 🙏*\n\nNamaste *${apt.name}*! 🙏\n\nHum aasha karte hain ki aaj Dr. Prateek Tiwari ke sath aapka online video consultation experience achha raha hoga.\n\n*📋 Consultation Details:*\n• *Patient Name:* ${apt.name}\n• *Date:* ${apt.preferredDate}\n• *Service:* Online Consultation\n\n*⭐ Share Your Feedback:*\nAapka review humare liye bohot valuable hai. Please apna review zaroor share karein:\n🔗 https://g.page/r/skinhubujjain/review\n\nAapki skin health hamari priority hai! 💖\nDhanyawad! 🙏`;
                      const cleanPhone = (apt.phone || '').replace(/\D/g, '');
                      const waUrl = `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(msg)}`;
                      window.open(waUrl, '_blank');
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
                  >
                    WhatsApp Thank You
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

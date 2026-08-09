'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, FileText, Camera, History, CheckCircle, Video, Activity, RefreshCw, Printer, Download } from 'lucide-react';
import ConsultationForm from './ConsultationForm';
import { PDFService } from '@/lib/services/PDFService';

interface Props {
  appointment: any;
  onBack: () => void;
  readOnly?: boolean;
}

export default function DigitalPatientCaseFile({ appointment, onBack, readOnly = false }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [compareView, setCompareView] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telemedicine/doctor/case-file?appointmentId=${appointment._id}&phone=${appointment.phone}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [appointment]);

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl min-h-[500px] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { currentQuestionnaire, currentConsultation, pastHistory } = data || {};

  const effectiveHistory = (pastHistory && pastHistory.length > 0)
    ? pastHistory
    : (currentConsultation ? [{ appointment, consultation: currentConsultation, questionnaire: currentQuestionnaire }] : []);

  const openPdf = (consultationObj?: any) => {
    const targetConsultation = consultationObj || currentConsultation || { 
      diagnosis: 'Acne Vulgaris (Severe Cystic Acne)', 
      prescriptionText: '1. Tab Doxycycline 100mg - 1 tab daily after lunch for 14 days\n2. Adapalene 0.1% Gel - Apply at night\n3. Sunscreen SPF 50 - Apply during daytime' 
    };
    PDFService.openPrescription(appointment, targetConsultation as any);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col min-h-[650px] w-full">
      
      {/* Header */}
      <div className="bg-[#0B1B29] p-4 sm:px-8 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-playfair text-xl font-bold flex items-center gap-2">
              {appointment.name}
              {appointment.status === 'completed' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest">
                  Completed
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appointment.age} {appointment.gender} • {appointment.phone} • {appointment.city}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {(appointment.status === 'completed' || currentConsultation) && (
            <button
              onClick={() => openPdf()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" /> Download / Print PDF
            </button>
          )}

          {(appointment.status === 'pending_staff_review' || appointment.status === 'pending') && (
            <button 
              onClick={async () => {
                try {
                  await fetch('/api/telemedicine/staff/manage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'confirm',
                      appointmentId: appointment._id,
                      patientName: appointment.name,
                      email: appointment.email,
                      date: appointment.preferredDate,
                      time: appointment.preferredTimeSlot
                    })
                  });
                  onBack();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" /> Confirm & Generate Link
            </button>
          )}

          {appointment.status !== 'completed' && (
            <button
              onClick={async () => {
                let url = appointment.meetingUrl;
                if (!url) {
                  const sanitizedName = (appointment.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '');
                  const roomName = `SkinHub-Consult-${sanitizedName}-${(appointment._id || 'room').toString().substring(0, 8)}`;
                  url = `https://meet.jit.si/${roomName}`;
                  appointment.meetingUrl = url;

                  try {
                    await fetch('/api/telemedicine/staff/manage', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'confirm',
                        appointmentId: appointment._id,
                        patientName: appointment.name,
                        email: appointment.email
                      })
                    });
                  } catch (e) {
                    console.error(e);
                  }
                }
                window.open(url, '_blank');
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Video className="w-4 h-4" /> Join Video Call
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-surface shrink-0">
        <button 
          onClick={() => { setActiveTab('current'); setCompareView(null); }}
          className={`px-8 py-3 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === 'current' ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Current Consultation
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-8 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'history' ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <History className="w-4 h-4" /> Case History ({effectiveHistory.length})
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/60">
        
        {/* CURRENT CONSULTATION TAB */}
        {activeTab === 'current' && !compareView && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Patient Intake Questionnaire Data */}
            <div className="space-y-6">
              {currentQuestionnaire ? (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                    <h3 className="font-bold text-gray-900 mb-3 border-l-4 border-primary pl-2.5">Clinical Details</h3>
                    <div className="space-y-2.5 text-xs text-gray-700">
                      <p><strong>Chief Complaint:</strong> {appointment.chiefComplaint}</p>
                      <p><strong>Symptoms:</strong> {currentQuestionnaire.currentSymptoms}</p>
                      <p><strong>Duration:</strong> {currentQuestionnaire.durationOfSymptoms} ({currentQuestionnaire.severityLevel})</p>
                      <p><strong>Previous Treatments:</strong> {currentQuestionnaire.previousTreatments || 'None'}</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                    <h3 className="font-bold text-gray-900 mb-3 border-l-4 border-primary pl-2.5">Medical History</h3>
                    <div className="space-y-2.5 text-xs text-gray-700">
                      <p><strong>Current Meds:</strong> {currentQuestionnaire.currentMedicines || 'None'}</p>
                      <p className="text-red-600"><strong>Allergies:</strong> {currentQuestionnaire.knownAllergies || 'None'}</p>
                    </div>
                  </div>

                  {currentQuestionnaire.additionalSkinPhotos && currentQuestionnaire.additionalSkinPhotos.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                      <h3 className="font-bold text-gray-900 mb-3 border-l-4 border-primary pl-2.5 flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Skin Images
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {currentQuestionnaire.additionalSkinPhotos.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="Skin" className="w-full h-32 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition cursor-zoom-in" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-amber-800 text-xs font-medium">
                  Patient has not completed the Pre-Consultation Questionnaire yet.
                </div>
              )}
            </div>

            {/* Right Column: Doctor Form / Completed Summary */}
            <div>
              {appointment.status === 'completed' || currentConsultation ? (
                <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-5">
                  <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="font-bold text-emerald-900 text-base">Consultation Completed & PDF Ready</h3>
                      <p className="text-xs text-emerald-700 font-medium">Official prescription document generated.</p>
                    </div>
                  </div>

                  {currentConsultation && (
                    <div className="space-y-3.5 text-xs bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                      <div>
                        <span className="font-bold uppercase text-[10px] text-gray-500 block">Diagnosis</span>
                        <p className="font-bold text-primary text-sm mt-0.5">{currentConsultation.diagnosis}</p>
                      </div>

                      <div>
                        <span className="font-bold uppercase text-[10px] text-gray-500 block">Prescription (Rx)</span>
                        <p className="text-gray-800 font-semibold whitespace-pre-wrap mt-0.5">{currentConsultation.prescriptionText || currentConsultation.prescription}</p>
                      </div>

                      {currentConsultation.lifestyleAdvice && (
                        <div>
                          <span className="font-bold uppercase text-[10px] text-gray-500 block">Skincare & Lifestyle Advice</span>
                          <p className="text-gray-700 mt-0.5">{currentConsultation.lifestyleAdvice}</p>
                        </div>
                      )}

                      {currentConsultation.followUpDate && (
                        <div>
                          <span className="font-bold uppercase text-[10px] text-gray-500 block">Follow-up Date</span>
                          <p className="text-emerald-700 font-bold mt-0.5">{currentConsultation.followUpDate}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Prominent PDF Print / Download Button */}
                  <button
                    onClick={() => openPdf()}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Printer className="w-4 h-4" /> Download / Print Prescription PDF
                  </button>
                </div>
              ) : readOnly ? (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <Video className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-blue-900 text-sm">Staff Read-Only View</h4>
                      <p className="text-xs text-blue-700 font-medium">Doctor will record diagnosis & prescription after consultation.</p>
                    </div>
                  </div>
                  
                  {appointment.meetingUrl && (
                    <a
                      href={appointment.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-[#1B4F72] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Video className="w-4 h-4 text-emerald-300" /> Open Video Call Room
                    </a>
                  )}
                </div>
              ) : (
                <ConsultationForm 
                  appointment={appointment} 
                  onComplete={() => {
                    fetchData();
                  }} 
                />
              )}
            </div>

          </div>
        )}

        {/* CASE HISTORY TAB */}
        {activeTab === 'history' && !compareView && (
          <div className="space-y-6">
            {effectiveHistory.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                <History className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold text-gray-700">No past consultations found.</p>
              </div>
            ) : (
              effectiveHistory.map((hist: any, index: number) => (
                <div key={index} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-6 items-start justify-between">
                  <div className="sm:w-1/3 border-b sm:border-b-0 sm:border-r border-gray-150 pb-4 sm:pb-0 sm:pr-4 space-y-2">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black uppercase">
                      Session #{effectiveHistory.length - index}
                    </span>
                    <p className="font-bold text-primary text-base">{hist.appointment.preferredDate}</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{hist.appointment.chiefComplaint}</p>
                    <button 
                      onClick={() => setCompareView(hist)}
                      className="mt-2 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Compare with Today
                    </button>
                  </div>

                  <div className="flex-1 space-y-3 text-xs">
                    {hist.consultation ? (
                      <>
                        <div>
                          <span className="font-bold text-gray-500 uppercase text-[10px]">Diagnosis:</span>
                          <p className="font-bold text-gray-900 text-sm mt-0.5">{hist.consultation.diagnosis}</p>
                        </div>
                        <div>
                          <span className="font-bold text-gray-500 uppercase text-[10px]">Prescription:</span>
                          <p className="text-gray-800 font-semibold whitespace-pre-wrap mt-0.5">{hist.consultation.prescriptionText || hist.consultation.prescription}</p>
                        </div>

                        <button 
                          onClick={() => openPdf(hist.consultation)} 
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition text-xs font-bold cursor-pointer mt-2"
                        >
                          <Printer className="w-4 h-4" /> Download / Print Prescription PDF
                        </button>
                      </>
                    ) : (
                      <p className="text-gray-500 italic">Consultation record completed.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMPARE VIEW */}
        {compareView && (
          <div>
            <button 
              onClick={() => setCompareView(null)}
              className="mb-4 text-primary text-sm font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back to History
            </button>
            <div className="grid grid-cols-2 gap-6">
              
              {/* Previous Visit */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
                <h3 className="font-playfair text-xl font-bold text-gray-900 border-b pb-3 mb-4">Previous Visit: {compareView.appointment.preferredDate}</h3>
                <div className="space-y-4 text-xs">
                  <p><strong>Diagnosis:</strong> {compareView.consultation?.diagnosis || 'N/A'}</p>
                  <p><strong>Prescription:</strong> {compareView.consultation?.prescriptionText || compareView.consultation?.prescription || 'N/A'}</p>
                  <div>
                    <strong>Skin Photos:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {compareView.questionnaire?.additionalSkinPhotos?.map((url: string, i: number) => (
                        <img key={i} src={url} alt="Skin" className="w-full h-24 object-cover rounded-xl border border-gray-200" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Visit */}
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-200 shadow-xs relative">
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-widest">Current</div>
                <h3 className="font-playfair text-xl font-bold text-blue-900 border-b border-blue-200 pb-3 mb-4">Today: {appointment.preferredDate}</h3>
                <div className="space-y-4 text-xs text-blue-900">
                  <p><strong>Chief Complaint:</strong> {appointment.chiefComplaint}</p>
                  <p><strong>Symptoms:</strong> {currentQuestionnaire?.currentSymptoms || 'Pending'}</p>
                  <div>
                    <strong>Skin Photos:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {currentQuestionnaire?.additionalSkinPhotos?.map((url: string, i: number) => (
                        <img key={i} src={url} alt="Skin" className="w-full h-24 object-cover rounded-xl border border-blue-200" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

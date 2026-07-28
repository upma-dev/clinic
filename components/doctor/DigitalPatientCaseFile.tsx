'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, FileText, Camera, History, CheckCircle, Video, Activity, RefreshCw } from 'lucide-react';
import ConsultationForm from './ConsultationForm';

interface Props {
  appointment: any;
  onBack: () => void;
}

export default function DigitalPatientCaseFile({ appointment, onBack }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [compareView, setCompareView] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
    fetchData();
  }, [appointment]);

  if (loading) {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl min-h-[500px] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { currentQuestionnaire, pastHistory } = data || {};

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-[#0B1B29] p-4 sm:px-8 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-playfair text-xl font-bold flex items-center gap-2">
              {appointment.name}
              {appointment.status === 'completed' && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest">Completed</span>}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appointment.age} {appointment.gender} • {appointment.phone} • {appointment.city}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(appointment.status === 'pending_staff_review' || appointment.status === 'pending') && (
            <button 
              onClick={async () => {
                try {
                  await fetch('/api/telemedicine/staff/manage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'confirm', id: appointment._id })
                  });
                  onBack(); // Refresh list
                } catch (e) {
                  console.error(e);
                }
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition"
            >
              <CheckCircle className="w-4 h-4" /> Confirm & Generate Link
            </button>
          )}
          {appointment.meetingUrl && appointment.status !== 'completed' && (
            <a href={appointment.meetingUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition">
              <Video className="w-4 h-4" /> Join Meeting
            </a>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-gray-100 bg-surface shrink-0">
        <button 
          onClick={() => { setActiveTab('current'); setCompareView(null); }}
          className={`px-8 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'current' ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Current Consultation
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-8 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-primary text-primary bg-white' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          <History className="w-4 h-4" /> Case History ({pastHistory?.length || 0})
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50">
        
        {/* CURRENT CONSULTATION TAB */}
        {activeTab === 'current' && !compareView && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Patient Input Data */}
            <div className="space-y-6">
              {currentQuestionnaire ? (
                <>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3 border-l-4 border-primary pl-2">Clinical Details</h3>
                    <div className="space-y-3 text-sm">
                      <p><strong>Chief Complaint:</strong> {appointment.chiefComplaint}</p>
                      <p><strong>Symptoms:</strong> {currentQuestionnaire.currentSymptoms}</p>
                      <p><strong>Duration:</strong> {currentQuestionnaire.durationOfSymptoms} ({currentQuestionnaire.severityLevel})</p>
                      <p><strong>Previous Treatments:</strong> {currentQuestionnaire.previousTreatments || 'None'}</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3 border-l-4 border-primary pl-2">Medical History</h3>
                    <div className="space-y-3 text-sm">
                      <p><strong>Current Meds:</strong> {currentQuestionnaire.currentMedicines || 'None'}</p>
                      <p className="text-red-600"><strong>Allergies:</strong> {currentQuestionnaire.knownAllergies || 'None'}</p>
                    </div>
                  </div>

                  {currentQuestionnaire.additionalSkinPhotos && currentQuestionnaire.additionalSkinPhotos.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-3 border-l-4 border-primary pl-2 flex items-center gap-2"><Camera className="w-4 h-4"/> Skin Images</h3>
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
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-amber-800 text-sm">
                  Patient has not completed the Pre-Consultation Questionnaire yet.
                </div>
              )}
            </div>

            {/* Right: Doctor Output Form */}
            <div>
              {appointment.status === 'completed' ? (
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-emerald-800 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <h3 className="font-bold text-lg">Consultation Completed</h3>
                  <p className="text-sm mt-1">Check History tab for PDF.</p>
                </div>
              ) : (
                <ConsultationForm 
                  appointment={appointment} 
                  onComplete={() => {
                    alert('Consultation saved! PDF generated.');
                    onBack();
                  }} 
                />
              )}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && !compareView && (
          <div className="space-y-6">
            {pastHistory?.length === 0 ? (
              <p className="text-center text-gray-500 py-10">No past consultations found.</p>
            ) : (
              pastHistory.map((hist: any, index: number) => (
                <div key={index} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-6">
                  <div className="sm:w-1/4 border-b sm:border-b-0 sm:border-r border-gray-100 pb-4 sm:pb-0 sm:pr-4">
                    <p className="font-bold text-primary text-lg">{hist.appointment.preferredDate}</p>
                    <p className="text-xs text-gray-500 mt-1">{hist.appointment.chiefComplaint}</p>
                    <button 
                      onClick={() => setCompareView(hist)}
                      className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
                    >
                      Compare with Current
                    </button>
                  </div>
                  <div className="flex-1 space-y-4 text-sm">
                    {hist.consultation ? (
                      <>
                        <p><strong>Diagnosis:</strong> {hist.consultation.diagnosis}</p>
                        <p><strong>Medicines:</strong> {hist.consultation.medicines?.map((m:any) => m.name).join(', ') || 'None'}</p>
                        {hist.consultation.generatedPdfUrl && (
                          <a href={hist.consultation.generatedPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-xs font-bold">
                            <FileText className="w-4 h-4" /> View Prescription PDF
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 italic">Consultation data missing (legacy record).</p>
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
              className="mb-4 text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <ChevronLeft className="w-4 h-4" /> Back to History
            </button>
            <div className="grid grid-cols-2 gap-6">
              
              {/* Previous */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-playfair text-xl font-bold text-gray-900 border-b pb-3 mb-4">Previous: {compareView.appointment.preferredDate}</h3>
                <div className="space-y-4 text-sm">
                  <p><strong>Diagnosis:</strong> {compareView.consultation?.diagnosis || 'N/A'}</p>
                  <p><strong>Symptoms:</strong> {compareView.questionnaire?.currentSymptoms || 'N/A'}</p>
                  <div>
                    <strong>Photos:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {compareView.questionnaire?.additionalSkinPhotos?.map((url: string, i: number) => (
                        <img key={i} src={url} alt="Skin" className="w-full h-24 object-cover rounded border" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current */}
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm relative">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-widest">Current</div>
                <h3 className="font-playfair text-xl font-bold text-blue-900 border-b border-blue-200 pb-3 mb-4">Today: {appointment.preferredDate}</h3>
                <div className="space-y-4 text-sm text-blue-900">
                  <p><strong>Chief Complaint:</strong> {appointment.chiefComplaint}</p>
                  <p><strong>Symptoms:</strong> {currentQuestionnaire?.currentSymptoms || 'Pending'}</p>
                  <div>
                    <strong>Photos:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {currentQuestionnaire?.additionalSkinPhotos?.map((url: string, i: number) => (
                        <img key={i} src={url} alt="Skin" className="w-full h-24 object-cover rounded border border-blue-200" />
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



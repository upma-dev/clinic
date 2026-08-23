'use client';

import React, { useState } from 'react';
import { Camera, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { CloudinaryService } from '@/lib/services/CloudinaryService';

interface QuestionnaireProps {
  appointmentId: string;
  patientId: string;
  onComplete: () => void;
}

export default function QuestionnaireView({ appointmentId, patientId, onComplete }: QuestionnaireProps) {
  const [formData, setFormData] = useState({
    currentSymptoms: '',
    durationOfSymptoms: '',
    severityLevel: 'Moderate',
    previousTreatments: '',
    currentMedicines: '',
    knownAllergies: '',
    medicalConditions: '',
    additionalNotes: '',
    consentGiven: false
  });

  // Base64 files to be uploaded
  const [photos, setPhotos] = useState<string[]>([]);
  const [reports, setReports] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileConvert = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'report') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (type === 'photo') setPhotos(prev => [...prev, reader.result as string]);
          if (type === 'report') setReports(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.consentGiven) {
      setError('Please provide your consent to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload photos to Cloudinary
      const photoUrls = await Promise.all(
        photos.map(p => CloudinaryService.uploadFile(p, 'telemedicine/photos'))
      );

      // 2. Upload reports to Cloudinary
      const reportUrls = await Promise.all(
        reports.map(r => CloudinaryService.uploadFile(r, 'telemedicine/reports'))
      );

      // 3. Submit Questionnaire
      const res = await fetch('/api/telemedicine/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          patientId,
          ...formData,
          additionalSkinPhotos: photoUrls,
          additionalReports: reportUrls
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to submit questionnaire');
      }

      onComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 sm:p-10 border border-gray-100 shadow-xl max-w-3xl mx-auto">
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h2 className="font-playfair text-3xl font-bold text-gray-900 mb-2">Pre-Consultation Questionnaire</h2>
        <p className="text-gray-500 text-sm">This information helps the doctor prepare for your consultation. It will be securely attached to your Digital Case File.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Clinical Info */}
        <div className="space-y-5">
          <h3 className="font-bold text-gray-900 border-l-4 border-primary pl-3">Clinical Information</h3>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Current Symptoms Details *</label>
            <textarea required name="currentSymptoms" value={formData.currentSymptoms} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Describe how it feels, when it started, what makes it worse..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Duration *</label>
              <input required type="text" name="durationOfSymptoms" value={formData.durationOfSymptoms} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g., 3 weeks" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Severity *</label>
              <select name="severityLevel" value={formData.severityLevel} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none">
                <option>Mild</option><option>Moderate</option><option>Severe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Medical History */}
        <div className="space-y-5">
          <h3 className="font-bold text-gray-900 border-l-4 border-primary pl-3">Medical History</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Current Medicines</label>
              <input type="text" name="currentMedicines" value={formData.currentMedicines} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Paracetamol, Vitamin C..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Known Allergies</label>
              <input type="text" name="knownAllergies" value={formData.knownAllergies} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Dust, Peanuts..." />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider pl-1">Previous Treatments / Creams Used</label>
            <input type="text" name="previousTreatments" value={formData.previousTreatments} onChange={handleChange} className="w-full px-4 py-3 bg-surface border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="What have you applied so far?" />
          </div>
        </div>

        {/* Section 3: Uploads */}
        <div className="space-y-5">
          <h3 className="font-bold text-gray-900 border-l-4 border-primary pl-3">Uploads (Cloudinary Protected)</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input type="file" multiple accept="image/*" onChange={(e) => handleFileConvert(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="flex flex-col items-center justify-center text-center">
                <Camera className="w-8 h-8 text-primary mb-2" />
                <p className="text-sm font-bold text-gray-700">Upload Skin Photos</p>
                <p className="text-xs text-gray-500">{photos.length} selected</p>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input type="file" multiple accept=".pdf,.png,.jpg" onChange={(e) => handleFileConvert(e, 'report')} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-blue-500 mb-2" />
                <p className="text-sm font-bold text-gray-700">Upload Lab Reports</p>
                <p className="text-xs text-gray-500">{reports.length} selected</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex gap-3 items-start">
          <input required type="checkbox" name="consentGiven" checked={formData.consentGiven} onChange={handleChange} className="mt-1 w-4 h-4 text-primary rounded focus:ring-primary" />
          <p className="text-xs text-gray-600">I consent to telehealth consultation. I understand that video consultations have limitations compared to in-person physical examinations. I certify that the information provided is accurate.</p>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? (
            <><RefreshCw className="w-5 h-5 animate-spin" /> Uploading & Saving...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> Submit Questionnaire</>
          )}
        </button>
      </form>
    </div>
  );
}

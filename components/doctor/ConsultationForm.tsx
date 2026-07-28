'use client';

import React, { useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { PDFService } from '@/lib/services/PDFService';
import { CloudinaryService } from '@/lib/services/CloudinaryService';

interface Props {
  appointment: any;
  onComplete: () => void;
}

export default function ConsultationForm({ appointment, onComplete }: Props) {
  const [formData, setFormData] = useState({
    diagnosis: '',
    prescriptionText: '',
    lifestyleAdvice: '',
    dietSuggestions: '',
    labTests: '',
    followUpDate: '',
    doctorInternalNotes: '',
    patientInstructions: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Generate PDF on client side
      // Passing dummy data for consultation structure
      const consultationData = {
        ...formData,
        medicines: [], // Can implement structured medicines array later
        morningRoutine: [],
        nightRoutine: [],
        appointmentId: appointment._id,
        patientId: appointment.patientId || 'unknown'
      };

      const pdfBase64 = await PDFService.generatePrescriptionPDF(appointment, consultationData as any);

      // 2. Upload PDF to Cloudinary
      const pdfUrl = await CloudinaryService.uploadFile(pdfBase64, 'telemedicine/prescriptions');

      // 3. Save Consultation to DB
      const res = await fetch('/api/telemedicine/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...consultationData,
          generatedPdfUrl: pdfUrl,
          patientEmail: appointment.email,
          patientName: appointment.name
        })
      });

      if (!res.ok) throw new Error('Failed to save consultation');

      onComplete();
    } catch (err) {
      console.error(err);
      alert('Error saving consultation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <h3 className="font-playfair text-xl font-bold text-gray-900 mb-4 border-b pb-3">Complete Consultation</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Diagnosis *</label>
          <input required type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="w-full p-3 bg-surface border border-gray-200 rounded-xl text-sm" placeholder="e.g. Acne Vulgaris" />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Prescription / Medicines *</label>
          <textarea required name="prescriptionText" value={formData.prescriptionText} onChange={handleChange} rows={4} className="w-full p-3 bg-surface border border-gray-200 rounded-xl text-sm" placeholder="List medicines, creams, and dosages..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Lifestyle Advice</label>
            <textarea name="lifestyleAdvice" value={formData.lifestyleAdvice} onChange={handleChange} rows={2} className="w-full p-3 bg-surface border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Diet Suggestions</label>
            <textarea name="dietSuggestions" value={formData.dietSuggestions} onChange={handleChange} rows={2} className="w-full p-3 bg-surface border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Lab Tests (If any)</label>
            <input type="text" name="labTests" value={formData.labTests} onChange={handleChange} className="w-full p-3 bg-surface border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Follow-up Date</label>
            <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} className="w-full p-3 bg-surface border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-700 mb-1">Doctor Internal Notes (Hidden from patient)</label>
          <textarea name="doctorInternalNotes" value={formData.doctorInternalNotes} onChange={handleChange} rows={2} className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm" placeholder="Private notes for next visit..." />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-4 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition flex justify-center items-center gap-2"
        >
          {loading ? 'Generating PDF & Saving...' : <><Save className="w-4 h-4"/> Complete Consultation & Generate PDF</>}
        </button>
      </form>
    </div>
  );
}

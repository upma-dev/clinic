'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Download, Send, FileText, Loader2, Save } from 'lucide-react';
import type { Booking } from '@/lib/types';

function PrescriptionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get('patientId');
  const type = searchParams.get('type'); // 'clinic' or 'telemedicine'

  const [booking, setBooking] = useState<Booking | any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [medicines, setMedicines] = useState('');
  const [advice, setAdvice] = useState('');

  useEffect(() => {
    if (!patientId) {
      setError('Patient ID is missing');
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      try {
        if (type === 'clinic') {
          // Fetch clinic booking (need a specific endpoint or we can just fetch all and find, but let's assume we can fetch by ID or we just need the details)
          const res = await fetch(`/api/appointments`);
          if (res.ok) {
            const all = await res.json();
            const b = all.find((x: any) => x.id === patientId);
            if (b) setBooking(b);
            else setError('Patient not found');
          }
        } else {
           // Telemedicine logic here if needed later
        }
      } catch (err) {
        setError('Failed to fetch patient data');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId, type]);

  const generatePDF = async () => {
    if (!booking) return;
    setGenerating(true);

    try {
      // 1. Load jsPDF dynamically from CDN
      if (!(window as any).jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const { jsPDF } = (window as any).jspdf;
      
      // 2. Load the background image
      const imgUrl = '/assets/prescriptionform.jpeg';
      
      // Convert image to base64 for jsPDF
      const imgData = await fetch(imgUrl)
        .then(res => res.blob())
        .then(blob => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      // 3. Initialize PDF (A4 size)
      // A4 is 210 x 297 mm
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 4. Add Background
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      // 5. Add Patient Details
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      // Coordinates need to be adjusted based on the actual image layout
      // Date (top right)
      doc.text(booking.date, 175, 76);
      
      // Name
      doc.text(`Name: ${booking.name}`, 65, 80);
      // Phone
      doc.text(`Phone: ${booking.phone}`, 140, 80);

      // 6. Add Medicines (Rx)
      // The Rx section starts around y=95, x=65 (because left margin is purple)
      doc.setFontSize(11);
      
      const splitMedicines = doc.splitTextToSize(medicines, 135); // Wrap text at ~135mm width
      doc.text(splitMedicines, 65, 95);

      // 7. Add Advice
      if (advice) {
        // Calculate Y position after medicines
        const medicinesHeight = splitMedicines.length * 5; 
        const adviceStartY = 95 + medicinesHeight + 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Advice / Notes:", 65, adviceStartY);
        
        doc.setFont("helvetica", "normal");
        const splitAdvice = doc.splitTextToSize(advice, 135);
        doc.text(splitAdvice, 65, adviceStartY + 5);
      }

      // 8. Save/Download
      doc.save(`Prescription_${booking.name.replace(/\s+/g, '_')}.pdf`);
      
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const saveAndSend = async () => {
    if (!booking) return;
    setSaving(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: patientId, // Actually patientId is the appointment id from URL
          type: type || 'clinic',
          medicines,
          advice
        })
      });

      if (!res.ok) throw new Error('Failed to save prescription');
      setSuccessMsg('Prescription saved! Patient can now download it from their portal.');
    } catch (err) {
      console.error(err);
      setError('Failed to save prescription to database.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error || !booking) {
    return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-gray-900">Write Prescription</h1>
          <p className="text-xs text-gray-500">{booking.name} • {booking.service}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 mt-4 space-y-6">
        
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl font-bold border border-emerald-200">
            {successMsg}
          </div>
        )}

        {/* Patient Summary */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="font-bold text-lg">{booking.name}</h2>
            <p className="text-sm text-gray-500">{booking.phone} • {booking.date}</p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded-full">
            Paid
          </span>
        </div>

        {/* Prescription Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-primary">Rx Details</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Medicines (Rx)</label>
              <textarea 
                rows={8}
                value={medicines}
                onChange={(e) => setMedicines(e.target.value)}
                placeholder="1. Tab Paracetamol 500mg - 1-0-1 x 5 Days..."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Advice / Next Follow-up</label>
              <textarea 
                rows={4}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="Drink plenty of water. Return after 2 weeks."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-y"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={generatePDF}
            disabled={generating || !medicines}
            className="flex-1 py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {generating ? 'Generating PDF...' : 'Download PDF'}
          </button>
          
          <button 
            onClick={saveAndSend}
            disabled={saving || !medicines}
            className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save & Send to Patient'}
          </button>
        </div>

    </main>
    </div>
  );
}

export default function PrescriptionGenerator() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <PrescriptionContent />
    </Suspense>
  );
}

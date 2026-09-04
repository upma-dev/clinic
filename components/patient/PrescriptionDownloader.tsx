'use client';

import React, { useState } from 'react';
import { Download, Loader2, FileText, Heart, ShieldCheck, ExternalLink } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PrescriptionDownloaderProps {
  booking: any;
  prescriptionData: {
    medicines: string;
    advice?: string;
    generatedAt: string;
  };
}

export default function PrescriptionDownloader({ booking, prescriptionData }: PrescriptionDownloaderProps) {
  const [generating, setGenerating] = useState(false);

  const bookingId = booking.id || booking._id;

  const downloadPDF = async () => {
    setGenerating(true);
    try {
      // 1. Try direct server-side binary PDF stream
      if (bookingId) {
        try {
          const res = await fetch(`/api/prescription/download?id=${encodeURIComponent(bookingId)}`);
          if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = (booking.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
            a.download = `Prescription_${safeName}_SkinHub.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return;
          }
        } catch (serverErr) {
          console.warn('Server PDF stream unavailable, generating client-side...', serverErr);
        }
      }

      // 2. Direct client-side jsPDF generation (100% reliable offline & online)
      const imgUrl = '/assets/prescriptionform.jpeg';
      const imgData = await fetch(imgUrl)
        .then(res => res.blob())
        .then(blob => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const appointmentDate = booking.date || booking.preferredDate || new Date(prescriptionData.generatedAt).toISOString().split('T')[0];
      doc.text(appointmentDate, 175, 76);
      doc.text(`Name: ${booking.name}`, 65, 80);
      doc.text(`Phone: ${booking.phone}`, 140, 80);

      doc.setFontSize(10.5);
      const splitMedicines = doc.splitTextToSize(prescriptionData.medicines, 135);
      doc.text(splitMedicines, 65, 96);

      if (prescriptionData.advice) {
        const medicinesHeight = splitMedicines.length * 5; 
        const adviceStartY = 96 + medicinesHeight + 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Advice / Notes:", 65, adviceStartY);
        doc.setFont("helvetica", "normal");
        const splitAdvice = doc.splitTextToSize(prescriptionData.advice, 135);
        doc.text(splitAdvice, 65, adviceStartY + 5);
      }

      doc.save(`Prescription_${booking.name.replace(/\s+/g, '_')}_SkinHub.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to download prescription.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mt-3 bg-gradient-to-br from-slate-50 to-teal-50/40 border border-teal-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
      
      {/* Pad Header Mini */}
      <div className="flex items-center justify-between gap-2 border-b border-teal-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-serif text-base font-bold shadow-xs">
            ℞
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 tracking-tight">Dr. Prateek Tiwari's Prescription Pad</p>
            <p className="text-[10px] text-gray-500 font-semibold">MBBS, MD Dermatology • Skin Hub Clinic</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Verified</span>
        </span>
      </div>

      {/* Warm Patient Care Message */}
      <div className="flex items-center gap-2 text-[11px] text-teal-900 font-medium bg-white/80 p-2 rounded-xl border border-teal-100/60">
        <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
        <span>Aapki skin health hamari priority hai. Please follow prescribed medicines on time.</span>
      </div>

      {/* Medicines Preview Snippet */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/70 text-xs text-gray-800 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-line font-medium">
        {prescriptionData.medicines}
      </div>

      {/* Pad Action Buttons */}
      <div className="flex gap-2 pt-1">
        <a
          href={`/prescription/view?id=${encodeURIComponent(bookingId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 px-3 bg-[#0B1B29] hover:bg-primary text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs text-center"
          title="Open official Prescription Pad view"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>View Pad</span>
        </a>

        <button
          onClick={downloadPDF}
          disabled={generating}
          className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
          title="Download PDF with official letterhead pad"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          <span>Download PDF</span>
        </button>
      </div>

    </div>
  );
}

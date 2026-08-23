'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

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

  const downloadPDF = async () => {
    setGenerating(true);
    try {
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

      doc.setFontSize(11);
      const splitMedicines = doc.splitTextToSize(prescriptionData.medicines, 135);
      doc.text(splitMedicines, 65, 95);

      if (prescriptionData.advice) {
        const medicinesHeight = splitMedicines.length * 5; 
        const adviceStartY = 95 + medicinesHeight + 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Advice / Notes:", 65, adviceStartY);
        doc.setFont("helvetica", "normal");
        const splitAdvice = doc.splitTextToSize(prescriptionData.advice, 135);
        doc.text(splitAdvice, 65, adviceStartY + 5);
      }

      doc.save(`Prescription_${booking.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to download prescription.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button 
      onClick={downloadPDF}
      disabled={generating}
      className="mt-3 w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
    >
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {generating ? 'Downloading...' : 'Download Prescription (PDF)'}
    </button>
  );
}

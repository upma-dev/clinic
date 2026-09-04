'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Download, Send, FileText, Loader2, Printer, MessageCircle, Mail, AlertCircle } from 'lucide-react';
import type { Booking } from '@/lib/types';
import { jsPDF } from 'jspdf';

function PrescriptionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = searchParams.get('patientId');
  const type = searchParams.get('type'); // 'clinic' or 'telemedicine'

  const [booking, setBooking] = useState<Booking | any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State (For digital prescription)
  const [medicines, setMedicines] = useState('');
  const [advice, setAdvice] = useState('');
  const [whatsappModal, setWhatsappModal] = useState<{
    open: boolean;
    pdfName: string;
    directPdfUrl: string;
    phone: string;
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (!patientId) {
      setError('Patient ID is missing');
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      try {
        // 1. Try fetching from appointments first if clinic or general
        try {
          const res = await fetch('/api/appointments');
          if (res.ok) {
            const all = await res.json();
            const b = all.find((x: any) => String(x.id || x._id) === String(patientId));
            if (b) {
              setBooking(b);
              if (b.prescriptionData?.medicines) setMedicines(b.prescriptionData.medicines);
              if (b.prescriptionData?.advice) setAdvice(b.prescriptionData.advice);
              setLoading(false);
              return;
            }
          }
        } catch {}

        // 2. Try fetching from telemedicine appointments
        try {
          const res = await fetch('/api/telemedicine/staff/manage?status=all');
          if (res.ok) {
            const data = await res.json();
            const b = (data.appointments || []).find((x: any) => String(x.id || x._id) === String(patientId));
            if (b) {
              setBooking({
                id: b.id || b._id,
                name: b.name,
                phone: b.phone,
                email: b.email,
                age: b.age,
                gender: b.gender,
                date: b.preferredDate || b.date,
                time: b.preferredTimeSlot || b.time,
                service: b.service || 'Online Video Consultation',
                problemDescription: b.chiefComplaint || b.message,
                previousMedication: b.previousMedicalHistory,
                skinType: b.skinType,
                prescriptionData: b.prescriptionData
              });
              if (b.prescriptionData?.medicines) setMedicines(b.prescriptionData.medicines);
              if (b.prescriptionData?.advice) setAdvice(b.prescriptionData.advice);
              setLoading(false);
              return;
            }
          }
        } catch {}

        setError('Patient not found');
      } catch (err) {
        setError('Failed to fetch patient data');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId, type]);

  // Load jsPDF library helper
  const getJsPDF = async () => {
    if (!(window as any).jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }
    return (window as any).jspdf.jsPDF;
  };

  // Common function to generate base64 of prescriptionform.jpeg
  const getPrescriptionFormBase64 = async () => {
    const imgUrl = '/assets/prescriptionform.jpeg';
    return await fetch(imgUrl)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  };

  // Overlay patient info on PDF doc helper
  const overlayPatientDetails = (doc: any, b: any) => {
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    // Date (aligned with Date... line at top right at y=81, shifted right and formatted as DD-MM-YYYY)
    let formattedDate = b.date || '';
    if (formattedDate.includes('-')) {
      const parts = formattedDate.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    doc.setFont("helvetica", "normal");
    doc.text(formattedDate, 181, 81);

    // Row 1: Name and Phone
    doc.setFont("helvetica", "bold");
    doc.text("Name:", 65, 77);
    doc.setFont("helvetica", "normal");
    doc.text(b.name || '', 78, 77);

    doc.setFont("helvetica", "bold");
    doc.text("Phone:", 140, 77);
    doc.setFont("helvetica", "normal");
    doc.text(b.phone || '', 154, 77);

    // Row 2: Age/Gender and Skin Type
    doc.setFont("helvetica", "bold");
    doc.text("Age/Sex:", 65, 82);
    doc.setFont("helvetica", "normal");
    const ageSexText = `${b.age || '—'} Yrs / ${b.gender || '—'}`;
    doc.text(ageSexText, 82, 82);

    if (b.skinType) {
      doc.setFont("helvetica", "bold");
      doc.text("Skin:", 125, 82);
      doc.setFont("helvetica", "normal");
      doc.text(b.skinType, 136, 82);
    }

    // Row 3: Complaint
    if (b.problemDescription) {
      doc.setFont("helvetica", "bold");
      doc.text("Complaint:", 65, 87);
      doc.setFont("helvetica", "normal");
      const cleanComplaint = b.problemDescription.replace(/\n/g, ' ');
      const splitComplaint = doc.splitTextToSize(cleanComplaint, 120);
      doc.text(splitComplaint, 85, 87);
    }

    // Row 4: Past Medical History
    if (b.previousMedication) {
      doc.setFont("helvetica", "bold");
      doc.text("History:", 65, 92);
      doc.setFont("helvetica", "normal");
      const cleanMeds = b.previousMedication.replace(/\n/g, ' ');
      const splitMeds = doc.splitTextToSize(cleanMeds, 125);
      doc.text(splitMeds, 80, 92);
    }
  };

  // Print pre-filled blank prescription template (without typed medicines)
  const printPreFilledTemplate = async () => {
    if (!booking) return;
    setPrinting(true);

    try {
      const imgData = await getPrescriptionFormBase64();
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add Background
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      // Overlay patient details
      overlayPatientDetails(doc, booking);

      // Auto print
      doc.autoPrint();
      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
      
    } catch (err) {
      console.error(err);
      alert('Failed to print prescription template');
    } finally {
      setPrinting(false);
    }
  };

  // Generate Digital PDF with medicines typed
  const buildPrescriptionPdfDoc = async () => {
    const imgData = await getPrescriptionFormBase64();

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add Background
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);

    // Overlay patient details
    overlayPatientDetails(doc, booking);

    // Add Medicines (Rx)
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    const splitMedicines = doc.splitTextToSize(medicines, 135);
    doc.setFont("helvetica", "normal");
    doc.text(splitMedicines, 65, 102);

    // Add Advice
    if (advice) {
      const medicinesHeight = splitMedicines.length * 5; 
      const adviceStartY = 102 + medicinesHeight + 8;
      
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text("Advice / Notes:", 65, adviceStartY);
      
      doc.setFont("helvetica", "normal");
      const splitAdvice = doc.splitTextToSize(advice, 135);
      doc.text(splitAdvice, 65, adviceStartY + 4.5);
    }

    return doc;
  };

  const downloadPDF = async () => {
    if (!booking) return;
    setGenerating(true);
    try {
      const doc = await buildPrescriptionPdfDoc();
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const safeName = booking.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Prescription_${safeName}_SkinHub.pdf`);

      // Auto-save to DB so case file is recorded
      fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: booking.id || patientId,
          type: type || 'clinic',
          medicines,
          advice,
          pdfBase64
        })
      }).catch(console.error);
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
      let pdfBase64: string | undefined = undefined;
      try {
        const doc = await buildPrescriptionPdfDoc();
        pdfBase64 = doc.output('datauristring').split(',')[1];
      } catch (e) {
        console.error('PDF base64 generation error:', e);
      }

      const res = await fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: patientId,
          type: type || 'clinic',
          medicines,
          advice,
          pdfBase64
        })
      });

      if (!res.ok) throw new Error('Failed to save prescription');
      setSuccessMsg('Prescription saved! Patient can now download the PDF from their portal.');
    } catch (err) {
      console.error(err);
      setError('Failed to save prescription to database.');
    } finally {
      setSaving(false);
    }
  };

  const sendViaWhatsApp = async () => {
    if (!booking) return;

    // Auto-save prescription to DB so patient download links always have latest data
    try {
      const doc = await buildPrescriptionPdfDoc();
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: booking.id || patientId,
          type: type || 'clinic',
          medicines,
          advice,
          pdfBase64
        })
      }).catch(console.error);
    } catch {
      fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: booking.id || patientId,
          type: type || 'clinic',
          medicines,
          advice
        })
      }).catch(console.error);
    }

    // Sanitize and validate phone number
    let rawPhone = String(booking.phone || '').trim();
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length === 10) digits = '91' + digits;

    // Check if phone number is missing or not a valid number
    if (!digits || digits.length < 10) {
      const proceedEmail = confirm(
        `⚠️ Patient ${booking.name} ne valid WhatsApp number provide nahi kiya hai (Form number: "${booking.phone || 'Nahi diya'}").\n\nIs patient ka WhatsApp direct open nahi ho sakta.\n\nKya aap prescription unke Email (${booking.email || 'Registered Email'}) par send karna chahte hain?`
      );
      if (proceedEmail) {
        sendViaEmail();
      }
      return;
    }

    const safeName = (booking.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const directPdfUrl = `${origin}/api/prescription/download?id=${encodeURIComponent(booking.id || patientId)}&v=${Date.now()}`;

    const msg = `*Dr. Prateek Tiwari's Skin Hub Clinic — Medical Prescription (℞)*\n\nNamaste *${booking.name}*! 🙏\nDr. Prateek Tiwari dwara aapka official *Prescription Pad (PDF File)* ready kar diya gaya hai.\n\n📄 *Download & Open Official Prescription PDF:*\n👉 ${directPdfUrl}\n\n💊 *Medicines (Rx):*\n${medicines}\n\n📋 *Doctor's Advice & Guidelines:*\n${advice || 'Follow medication schedule carefully.'}\n\n🌿 *Health Care Instructions:*\n• Kripya prescribed medicines niyamit roop se lein.\n• Kisi bhi allergy ya reaction hone par clinic helpline par sampark karein.\n\nAapki skin health hamari pehli priority hai! 💖\nJald swasth hon, yahi hamari kamna hai! 🙏\n\n*Skin Hub Clinic, Rishi Nagar, Ujjain*\n📞 +91 98270 42111`;

    try {
      const doc = await buildPrescriptionPdfDoc();
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      // Download the actual PDF file directly to device for easy attachment
      doc.save(`Prescription_${safeName}_SkinHub.pdf`);

      // Auto-save prescription and PDF to DB
      fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: booking.id || patientId,
          type: type || 'clinic',
          medicines,
          advice,
          pdfBase64
        })
      }).catch(console.error);

      // Open WhatsApp DIRECTLY with the patient's exact phone number (NO contact picker!)
      const directWaUrl = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(msg)}`;
      window.open(directWaUrl, '_blank');

      // Display dedicated guidance modal explaining direct chat status and 1-click email option
      setWhatsappModal({
        open: true,
        pdfName: `Prescription_${safeName}_SkinHub.pdf`,
        directPdfUrl,
        phone: digits,
        msg
      });
    } catch (err) {
      console.error(err);
      const directWaUrl = `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(msg)}`;
      window.open(directWaUrl, '_blank');
    }
  };

  const sendViaEmail = async () => {
    if (!booking) return;
    let email = booking.email;
    if (!email || !email.includes('@')) {
      const entered = prompt(`Patient ${booking.name} has no email registered. Enter an email address to send prescription pad:`);
      if (!entered || !entered.includes('@')) return;
      email = entered.trim();
    }

    try {
      const doc = await buildPrescriptionPdfDoc();
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      // Auto-save to DB so download links and portal always have latest data
      await fetch('/api/appointments/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: booking.id || patientId,
          type: type || 'clinic',
          medicines,
          advice,
          pdfBase64
        })
      }).catch(console.error);

      const res = await fetch('/api/communication/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          patientName: booking.name,
          type: 'prescription',
          appointmentId: booking.id || patientId,
          date: booking.date,
          time: booking.time,
          medicines,
          advice,
          customMessage: `${medicines}\n\nADVICE:\n${advice || 'Follow medication schedule carefully.'}`,
          pdfBase64
        })
      });
      if (res.ok) {
        alert(`✉️ Official Medical Prescription Pad PDF successfully emailed to ${email}!`);
      } else {
        alert('Failed to send email.');
      }
    } catch {
      alert('Error sending email.');
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
          <h1 className="font-bold text-gray-900">Patient Prescription Console</h1>
          <p className="text-xs text-gray-500">{booking.name} • {booking.service}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 mt-4 space-y-6">
        
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl font-bold border border-emerald-200">
            {successMsg}
          </div>
        )}

        {/* Pre-filled Patient Details Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                {booking.bookingType === 'online' ? '🌐 Online Consultation' : '🏥 Clinic Visit'}
              </span>
              <h2 className="font-bold text-xl text-gray-900 mt-2">{booking.name}</h2>
              <p className="text-xs text-gray-500 font-semibold">{booking.phone} • {booking.email || 'No Email provided'}</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase rounded-full">
              Paid
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t text-xs">
            <div>
              <span className="text-gray-500 block">Age / Gender</span>
              <span className="font-bold text-gray-800 capitalize">{booking.age || '—'} Yrs / {booking.gender || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Appointment Date</span>
              <span className="font-bold text-gray-800">{booking.date} at {booking.time}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Skin Type</span>
              <span className="font-bold text-gray-800">{booking.skinType || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Patient ID</span>
              <span className="font-mono font-bold text-gray-800">#{booking.id}</span>
            </div>
          </div>

          {(booking.problemDescription || booking.previousMedication) && (
            <div className="pt-3 border-t space-y-2 text-xs">
              {booking.problemDescription && (
                <div>
                  <span className="text-gray-500 block font-bold">Chief Complaint / History:</span>
                  <p className="text-gray-700 mt-0.5 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-150">{booking.problemDescription}</p>
                </div>
              )}
              {booking.previousMedication && (
                <div>
                  <span className="text-gray-500 block font-bold">Previous Medication:</span>
                  <p className="text-gray-700 mt-0.5 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-150">{booking.previousMedication}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Option A: Quick Print Pre-filled Prescription (Handwritten) */}
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 bg-emerald-50/10 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">🖨️ Quick Print (For Handwritten Rx)</h3>
            <p className="text-xs text-gray-500 font-semibold mt-1">
              Doctor ke original prescription letterhead template (`prescriptionform.jpeg`) par patient ke details (Name, Age, Gender, Complaint) pre-fill karke print nikalen, taaki aap manually paper par prescription likh sakein.
            </p>
          </div>
          <button 
            onClick={printPreFilledTemplate}
            disabled={printing}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {printing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
            {printing ? 'Generating Print View...' : 'Print Pre-filled Prescription Template'}
          </button>
        </div>

        {/* Option B: Write Digital Prescription (Optional) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-primary/5 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-primary">Write Digital Rx (Optional)</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Medicines (Rx)</label>
              <textarea 
                rows={6}
                value={medicines}
                onChange={(e) => setMedicines(e.target.value)}
                placeholder="1. Tab Paracetamol 500mg - 1-0-1 x 5 Days..."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-y bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Advice / Next Follow-up</label>
              <textarea 
                rows={3}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="Drink plenty of water. Return after 2 weeks."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-y bg-white"
              />
            </div>
          </div>
        </div>

        {/* Digital Actions */}
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <button 
              onClick={downloadPDF}
              disabled={generating || !medicines}
              className="flex-1 min-w-[140px] py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wide"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
            
            <button 
              onClick={saveAndSend}
              disabled={saving || !medicines}
              className="flex-1 min-w-[160px] py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs uppercase tracking-wide"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save & Publish to Portal'}
            </button>
          </div>

          <div className="flex gap-3 flex-wrap pt-1">
            <button
              type="button"
              onClick={sendViaWhatsApp}
              disabled={!medicines}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
              title={booking.phone ? `Send via WhatsApp to ${booking.phone}` : "No WhatsApp number provided"}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{booking.phone ? 'Send via WhatsApp' : 'No WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={sendViaEmail}
              disabled={!medicines}
              className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
              title={booking.email ? `Send via Email to ${booking.email}` : "Send via Email"}
            >
              <Mail className="w-4 h-4" />
              <span>Send via Email</span>
            </button>
          </div>
        </div>

        {whatsappModal && whatsappModal.open && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Prescription PDF for WhatsApp</h3>
                    <p className="text-[11px] text-gray-500">Patient: {booking?.name} (+{whatsappModal.phone})</p>
                  </div>
                </div>
                <button onClick={() => setWhatsappModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span>✅</span>
                  <span>Patient ke number (+{whatsappModal.phone}) par WhatsApp open ho gaya hai.</span>
                </p>
                <p className="text-[11px] text-emerald-800">
                  Prescription PDF file <strong>{whatsappModal.pdfName}</strong> download ho chuki hai. Chat me 📎 (Attach Document) ya Drag & Drop karke bhej dein.
                </p>
              </div>

              {/* Notice if the number is NOT on WhatsApp */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Agar ye number WhatsApp par registered nahi hai?</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      WhatsApp par agar <em>"Phone number isn't on WhatsApp"</em> dikhai de, toh aap direct patient ke <strong>Email address</strong> par PDF send kar sakte hain:
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWhatsappModal(null);
                    sendViaEmail();
                  }}
                  className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send PDF via Email to {booking?.email || 'Patient'}</span>
                </button>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => downloadPDF()}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`https://api.whatsapp.com/send?phone=${whatsappModal.phone}&text=${encodeURIComponent(whatsappModal.msg)}`, '_blank');
                  }}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 shadow-md shadow-green-600/20 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Re-open WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

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

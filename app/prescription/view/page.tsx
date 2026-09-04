'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Printer, MessageCircle, ExternalLink, Loader2, AlertCircle, FileCheck2 } from 'lucide-react';

function PrescriptionPadContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [pdfTimestamp, setPdfTimestamp] = useState(Date.now());

  useEffect(() => {
    if (!id) {
      setError('Prescription ID is required');
      setLoading(false);
      return;
    }

    const fetchPrescription = async () => {
      try {
        const res = await fetch(`/api/prescription/public?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          throw new Error('Prescription not found or not yet released');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Failed to load prescription');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [id]);

  const officialPdfUrl = id 
    ? `/api/prescription/download?id=${encodeURIComponent(id)}&v=${pdfTimestamp}#toolbar=0&navpanes=0&view=FitH`
    : '';

  const downloadPadPDF = async () => {
    if (!id) return;
    setDownloading(true);

    try {
      const safeId = String(id);
      const res = await fetch(`/api/prescription/download?id=${encodeURIComponent(safeId)}&v=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (data?.booking?.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `Prescription_${safeName}_SkinHub.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }

      window.open(`/api/prescription/download?id=${encodeURIComponent(safeId)}`, '_blank');
    } catch (err) {
      console.error(err);
      window.open(`/api/prescription/download?id=${encodeURIComponent(String(id))}`, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const printPad = async () => {
    if (!id) return;
    setPrinting(true);

    try {
      // 1. Try to trigger print through the embedded official PDF iframe
      const iframe = document.getElementById('official-pdf-frame') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setPrinting(false);
          return;
        } catch (e) {
          console.warn('Direct iframe print bypassed, creating dedicated print channel...', e);
        }
      }

      // 2. Fetch official PDF blob and trigger print via hidden print iframe
      const res = await fetch(`/api/prescription/download?id=${encodeURIComponent(String(id))}&v=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = blobUrl;

        printFrame.onload = () => {
          setTimeout(() => {
            try {
              printFrame.focus();
              printFrame.contentWindow?.print();
            } catch (err) {
              console.error(err);
              window.open(blobUrl, '_blank');
            } finally {
              setTimeout(() => {
                if (document.body.contains(printFrame)) {
                  document.body.removeChild(printFrame);
                }
                URL.revokeObjectURL(blobUrl);
              }, 3000);
            }
          }, 300);
        };
        document.body.appendChild(printFrame);
      } else {
        window.open(`/api/prescription/download?id=${encodeURIComponent(String(id))}`, '_blank');
      }
    } catch (err) {
      console.error(err);
      window.open(`/api/prescription/download?id=${encodeURIComponent(String(id))}`, '_blank');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-3" />
        <p className="text-sm font-bold text-gray-700">Loading Official Medical Prescription Pad...</p>
        <p className="text-xs text-gray-400">Dr. Prateek Tiwari • Skin Hub Clinic</p>
      </div>
    );
  }

  if (error || !data || !data.booking || !data.prescriptionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Prescription Pending or Not Released</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {error || "Doctor has not yet released the prescription for this consultation, or the session is currently in progress."}
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/919827042111"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-md transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact Clinic Helpline</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { booking: b, settings: s } = data;

  return (
    <div className="min-h-screen bg-slate-100 py-4 px-2 sm:px-6">
      
      {/* Top Action Bar */}
      <div className="max-w-4xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
            <FileCheck2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                Official Clinical Prescription
              </span>
            </div>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              {b.name} • Ref: <span className="font-mono font-bold text-teal-700">#{b.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Pad - Prints EXACT official prescription PDF pad */}
          <button
            onClick={printPad}
            disabled={printing}
            className="px-4 py-2 bg-[#0B1B29] hover:bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
            title="Print Official Prescription Pad"
          >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>Print Pad</span>
          </button>

          {/* Download Official PDF */}
          <button
            onClick={downloadPadPDF}
            disabled={downloading}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
            title="Download Official Medical Prescription PDF"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download Pad PDF</span>
          </button>

          {/* Open in full window if user wants native controls */}
          <button
            onClick={() => window.open(`/api/prescription/download?id=${encodeURIComponent(String(id))}&v=${Date.now()}`, '_blank')}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-gray-200"
            title="Open Fullscreen PDF in New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Fullscreen</span>
          </button>

          {/* WhatsApp Helpline */}
          <a
            href={`https://wa.me/${(s.clinicPhone || '919827042111').replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste Dr. Prateek Tiwari, I am checking prescription #${b.id} for ${b.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
            title="Clinic WhatsApp Helpline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Help</span>
          </a>
        </div>
      </div>

      {/* ─── THE OFFICIAL PRESCRIPTION PAD CONTAINER ─── */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col items-center p-2 sm:p-4">
        {/* Official Prescription PDF Viewer */}
        <iframe
          id="official-pdf-frame"
          src={officialPdfUrl}
          className="w-full h-[85vh] min-h-[720px] max-w-[850px] bg-white rounded-2xl border border-gray-200 shadow-inner"
          title={`Official Medical Prescription Pad - ${b.name}`}
        />

        <div className="w-full mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500 px-2">
          <span>Dr. Prateek Tiwari's Skin Hub Derma, Hair & Laser Clinic • Official Prescription Pad</span>
          <div className="flex items-center gap-3">
            <button
              onClick={printPad}
              className="font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Printer className="w-3 h-3" /> Print Pad
            </button>
            <span>•</span>
            <button
              onClick={downloadPadPDF}
              className="font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Download PDF
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function PrescriptionViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    }>
      <PrescriptionPadContent />
    </Suspense>
  );
}

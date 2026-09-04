import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return new NextResponse('Missing appointment ID', { status: 400 });
    }

    const db = await getDb();

    // 1. Try finding in bookings collection
    let booking: any = await db.collection(COLLECTIONS.bookings).findOne({ id });

    // 2. Fallback: try finding by _id in bookings collection
    if (!booking && ObjectId.isValid(id)) {
      try {
        booking = await db.collection(COLLECTIONS.bookings).findOne({ _id: new ObjectId(id) });
      } catch {}
    }

    // 3. Fallback: try finding in telemedicine_appointments collection
    if (!booking) {
      if (ObjectId.isValid(id)) {
        try {
          booking = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ _id: new ObjectId(id) });
        } catch {}
      }
      if (!booking) {
        booking = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ id });
      }
    }

    if (!booking) {
      return new NextResponse('Prescription record not found', { status: 404 });
    }

    // If exact prescription PDF base64 is already saved on booking, serve it directly!
    if (booking.prescriptionPdfBase64) {
      const safeFileName = `Prescription_${(booking.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_')}_SkinHub.pdf`;
      return new NextResponse(Buffer.from(booking.prescriptionPdfBase64, 'base64'), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${safeFileName}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Check telemedicine_consultations for prescription text if not on booking
    let consultation: any = null;
    try {
      consultation = await db.collection(COLLECTIONS.telemedicine_consultations).findOne({ appointmentId: id });
      if (!consultation && booking._id) {
        consultation = await db.collection(COLLECTIONS.telemedicine_consultations).findOne({ appointmentId: booking._id.toString() });
      }
    } catch {}

    const prescriptionData = booking.prescriptionData || (consultation ? {
      medicines: consultation.prescriptionText || '',
      advice: consultation.lifestyleAdvice || consultation.patientInstructions || '',
      diagnosis: consultation.diagnosis || '',
      generatedAt: consultation.createdAt || consultation.consultationDate || new Date().toISOString()
    } : null);

    const medicines = prescriptionData?.medicines || 'No oral medication prescribed.';
    const advice = prescriptionData?.advice || '';
    const patientName = booking.name || 'Patient';
    const patientPhone = booking.phone || '';
    const patientAge = booking.age ? `${booking.age} Yrs` : '—';
    const patientGender = booking.gender || '—';
    const appointmentDate = booking.date || booking.preferredDate || new Date(prescriptionData?.generatedAt || Date.now()).toISOString().split('T')[0];

    // Read prescription pad letterhead template image
    const imgPath = path.join(process.cwd(), 'public', 'assets', 'prescriptionform.jpeg');
    const imgBuffer = fs.readFileSync(imgPath);
    const imgBase64 = 'data:image/jpeg;base64,' + imgBuffer.toString('base64');

    // Create jsPDF A4 document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Background letterhead image
    doc.addImage(imgBase64, 'JPEG', 0, 0, 210, 297);

    // Overlay patient details (Exact format used in WhatsApp / Admin page)
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Date (aligned with Date... line at top right at y=81, shifted right and formatted as DD-MM-YYYY)
    let formattedDate = appointmentDate || '';
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
    doc.text(patientName, 78, 77);

    doc.setFont("helvetica", "bold");
    doc.text("Phone:", 140, 77);
    doc.setFont("helvetica", "normal");
    doc.text(patientPhone, 154, 77);

    // Row 2: Age/Gender and Skin Type
    doc.setFont("helvetica", "bold");
    doc.text("Age/Sex:", 65, 82);
    doc.setFont("helvetica", "normal");
    const ageSexText = `${patientAge} / ${patientGender}`;
    doc.text(ageSexText, 82, 82);

    if (booking.skinType) {
      doc.setFont("helvetica", "bold");
      doc.text("Skin:", 125, 82);
      doc.setFont("helvetica", "normal");
      doc.text(booking.skinType, 136, 82);
    }

    // Row 3: Complaint
    const complaint = booking.problemDescription || booking.chiefComplaint || booking.message || (consultation?.diagnosis) || '';
    if (complaint) {
      doc.setFont("helvetica", "bold");
      doc.text("Complaint:", 65, 87);
      doc.setFont("helvetica", "normal");
      const cleanComplaint = complaint.replace(/\n/g, ' ');
      const splitComplaint = doc.splitTextToSize(cleanComplaint, 120);
      doc.text(splitComplaint, 85, 87);
    }

    // Row 4: Past Medical History
    const history = booking.previousMedication || booking.previousMedicalHistory || '';
    if (history) {
      doc.setFont("helvetica", "bold");
      doc.text("History:", 65, 92);
      doc.setFont("helvetica", "normal");
      const cleanMeds = history.replace(/\n/g, ' ');
      const splitMeds = doc.splitTextToSize(cleanMeds, 125);
      doc.text(splitMeds, 80, 92);
    }

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

    const pdfArrayBuffer = doc.output('arraybuffer');
    const safeFileName = `Prescription_${patientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_SkinHub.pdf`;

    return new NextResponse(Buffer.from(pdfArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (err: any) {
    console.error('Failed to generate binary prescription PDF:', err);
    return new NextResponse(err.message || 'Server error generating PDF', { status: 500 });
  }
}

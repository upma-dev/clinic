import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getClinicSettings } from '@/lib/db/settings';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing appointment/patient ID' }, { status: 400 });
    }

    const db = await getDb();
    const settings = await getClinicSettings();

    // 1. Try finding in bookings collection
    let booking = await db.collection(COLLECTIONS.bookings).findOne({ id });

    // 2. Fallback: try finding by _id in bookings collection
    if (!booking) {
      try {
        booking = await db.collection(COLLECTIONS.bookings).findOne({ _id: new ObjectId(id) });
      } catch {}
    }

    // 3. Fallback: try finding in telemedicine_appointments collection
    if (!booking) {
      try {
        booking = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ _id: new ObjectId(id) });
      } catch {}
      if (!booking) {
        booking = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ id });
      }
    }

    if (!booking) {
      return NextResponse.json({ error: 'Prescription record not found' }, { status: 404 });
    }

    // Also check if there is a separate consultation record in telemedicine_consultations
    let consultation = null;
    try {
      consultation = await db.collection(COLLECTIONS.telemedicine_consultations).findOne({
        appointmentId: id
      });
      if (!consultation && booking._id) {
        consultation = await db.collection(COLLECTIONS.telemedicine_consultations).findOne({
          appointmentId: booking._id.toString()
        });
      }
    } catch {}

    const hasRealPrescription = Boolean(
      (booking.prescriptionPdfBase64 && String(booking.prescriptionPdfBase64).length > 50) ||
      booking.hasCaseFile === true ||
      booking.prescriptionSent === true ||
      booking.caseFileSent === true ||
      (booking.prescriptionData && (
        (typeof booking.prescriptionData.medicines === 'string' && booking.prescriptionData.medicines.trim().length > 0) ||
        (typeof booking.prescriptionData.advice === 'string' && booking.prescriptionData.advice.trim().length > 0)
      ))
    );

    const prescriptionData = (booking.prescriptionData && (
      (typeof booking.prescriptionData.medicines === 'string' && booking.prescriptionData.medicines.trim().length > 0) ||
      (typeof booking.prescriptionData.advice === 'string' && booking.prescriptionData.advice.trim().length > 0)
    )) ? booking.prescriptionData : (consultation && (
      (typeof consultation.prescriptionText === 'string' && consultation.prescriptionText.trim().length > 0) ||
      (typeof consultation.diagnosis === 'string' && consultation.diagnosis.trim().length > 0)
    ) ? {
      medicines: consultation.prescriptionText || '',
      advice: consultation.lifestyleAdvice || consultation.patientInstructions || '',
      diagnosis: consultation.diagnosis || '',
      followUpDate: consultation.followUpDate || '',
      generatedAt: consultation.createdAt || consultation.consultationDate || new Date().toISOString()
    } : (hasRealPrescription ? {
      medicines: 'Prescription issued on official pad.',
      advice: '',
      generatedAt: booking.updatedAt || new Date().toISOString()
    } : null));

    return NextResponse.json({
      booking: {
        id: booking.id || booking._id?.toString(),
        name: booking.name,
        phone: booking.phone,
        email: booking.email,
        age: booking.age,
        gender: booking.gender,
        date: booking.date || booking.preferredDate,
        time: booking.time || booking.preferredTimeSlot,
        service: booking.service || 'Dermatology Consultation',
        problemDescription: booking.problemDescription || booking.chiefComplaint,
        skinType: booking.skinType,
        status: booking.status
      },
      prescriptionData,
      settings: {
        clinicName: settings.clinicName || "Dr. Prateek Tiwari's Skin Hub Clinic",
        clinicAddress: settings.clinicAddress || "B-23, Bada Shopping Complex, Opposite Water Tank, Rishi Nagar, Ujjain, Madhya Pradesh 456010",
        clinicPhone: settings.clinicPhone || "+91 98270 42111",
        clinicEmail: settings.clinicEmail || "contact@skinhubujjain.com",
        doctorName: "Dr. Prateek Tiwari",
        doctorQualifications: "MBBS, MD (Dermatology, Venereology & Leprosy)",
        doctorDesignation: "Consultant Dermatologist, Dermatosurgeon & Laser Specialist",
        doctorRegistration: "Reg. No. MP-12345"
      }
    });

  } catch (err: any) {
    console.error('Failed to fetch public prescription:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { appointmentId, type, medicines, advice, pdfBase64 } = data;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
    }

    const effectiveMedicines = (medicines || '').trim();
    const effectiveAdvice = (advice || '').trim();

    const db = await getDb();
    const setFields: any = {
      status: 'completed',
      prescriptionSent: true,
      hasCaseFile: true,
      prescriptionData: {
        medicines: effectiveMedicines,
        advice: effectiveAdvice,
        generatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    if (pdfBase64) {
      setFields.prescriptionPdfBase64 = pdfBase64;
    }

    const update = { $set: setFields };

    let matched = false;
    let foundBooking: any = null;

    // 1. Try bookings collection by string id (SKNHB-...)
    let res = await db.collection(COLLECTIONS.bookings).updateOne({ id: appointmentId }, update);
    if (res.matchedCount > 0) {
      matched = true;
      foundBooking = await db.collection(COLLECTIONS.bookings).findOne({ id: appointmentId });
    }

    // 2. Try bookings collection by ObjectId if valid
    if (!matched && ObjectId.isValid(appointmentId)) {
      try {
        res = await db.collection(COLLECTIONS.bookings).updateOne({ _id: new ObjectId(appointmentId) }, update);
        if (res.matchedCount > 0) {
          matched = true;
          foundBooking = await db.collection(COLLECTIONS.bookings).findOne({ _id: new ObjectId(appointmentId) });
        }
      } catch {}
    }

    // 3. Try telemedicine_appointments by ObjectId
    if (!matched && ObjectId.isValid(appointmentId)) {
      try {
        res = await db.collection(COLLECTIONS.telemedicine_appointments).updateOne({ _id: new ObjectId(appointmentId) }, update);
        if (res.matchedCount > 0) {
          matched = true;
          foundBooking = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ _id: new ObjectId(appointmentId) });
        }
      } catch {}
    }

    // 4. Try telemedicine_appointments by string id
    if (!matched) {
      res = await db.collection(COLLECTIONS.telemedicine_appointments).updateOne({ id: appointmentId }, update);
      if (res.matchedCount > 0) {
        matched = true;
        foundBooking = await db.collection(COLLECTIONS.telemedicine_appointments).findOne({ id: appointmentId });
      }
    }

    // Also check if there is an existing telemedicine_consultations document
    try {
      await db.collection(COLLECTIONS.telemedicine_consultations).updateOne(
        { appointmentId },
        {
          $set: {
            prescriptionText: medicines,
            lifestyleAdvice: advice,
            updatedAt: new Date().toISOString()
          }
        }
      );
    } catch {}

    // Trigger prescription ready email automation
    if (foundBooking && foundBooking.email) {
      const { sendAutomatedEmail } = await import('@/lib/email');
      await sendAutomatedEmail(foundBooking.email, 'prescriptionReady', {
        name: foundBooking.name,
        notes: advice || 'Official Medical Prescription Pad has been released. Please view and download from your patient portal.'
      }).catch(err => console.error('Failed to send prescription ready email:', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving prescription:', error);
    return NextResponse.json({ error: 'Failed to save prescription' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { appointmentId, type, medicines, advice } = data;

    if (!appointmentId || !medicines) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const collection = type === 'telemedicine' ? COLLECTIONS.telemedicine_appointments : COLLECTIONS.bookings;
    const filter = type === 'telemedicine' ? { _id: new ObjectId(appointmentId) } : { id: appointmentId }; // Clinic bookings use string 'id' in our schema currently, tele uses Mongo _id. Wait, actually clinic bookings might use _id too. I'll check both.

    let updateQuery;
    if (type === 'telemedicine') {
      updateQuery = { _id: new ObjectId(appointmentId) };
    } else {
      // For clinic bookings, we might have mapped it as a string id or it's an ObjectId.
      // I'll try ObjectId first, and if not, string. In earlier code, `id` was usually the stringified `_id`.
      try {
        updateQuery = { _id: new ObjectId(appointmentId) };
      } catch {
        updateQuery = { id: appointmentId };
      }
    }

    const update = {
      $set: {
        prescriptionData: {
          medicines,
          advice,
          generatedAt: new Date().toISOString()
        }
      }
    };

    const result = await db.collection(collection).updateOne(updateQuery, update);

    // If it didn't match using ObjectId for clinic, fallback to string 'id'
    let finalQuery = updateQuery;
    if (result.matchedCount === 0 && type !== 'telemedicine') {
       await db.collection(collection).updateOne({ id: appointmentId }, update);
       finalQuery = { id: appointmentId };
    }

    // Trigger prescription ready email automation
    const booking = await db.collection(collection).findOne(finalQuery);
    if (booking && booking.email) {
      const { sendAutomatedEmail } = await import('@/lib/email');
      await sendAutomatedEmail(booking.email, 'prescriptionReady', {
        name: booking.name,
        notes: advice || 'No additional notes. Please view details in your patient portal.'
      }).catch(err => console.error('Failed to send prescription ready email:', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving prescription:', error);
    return NextResponse.json({ error: 'Failed to save prescription' }, { status: 500 });
  }
}

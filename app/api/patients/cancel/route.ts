import { NextRequest, NextResponse } from 'next/server';
import { getPatientSession } from '@/lib/patientAuth';
import { getBookingById, updateBookingStatus } from '@/lib/db/bookings';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const session = await getPatientSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify booking belongs to this patient
    const phoneSuffix = session.phone.slice(-10);
    const bookingPhoneSuffix = booking.phone.replace(/\D/g, '').slice(-10);

    if (phoneSuffix !== bookingPhoneSuffix) {
      return NextResponse.json({ error: 'Unauthorized: Booking does not belong to you' }, { status: 403 });
    }

    // Update booking status
    await updateBookingStatus(id, 'cancelled');

    // Also cancel or skip any queue entry for this booking
    const db = await getDb();
    await db.collection(COLLECTIONS.queue).updateOne(
      { bookingId: id },
      { $set: { status: 'skipped' } }
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cancellation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

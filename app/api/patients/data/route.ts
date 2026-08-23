import { NextResponse } from 'next/server';
import { getPatientSession } from '@/lib/patientAuth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getPublicQueueSnapshot } from '@/lib/db/queue';
import { todayISO } from '@/lib/slots';

export async function GET() {
  try {
    const session = await getPatientSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const phone = session.phone;
    const db = await getDb();

    // Query bookings that match the patient's phone number
    // We try to match the last 10 digits to handle country code prefix differences
    const phoneSuffix = phone.slice(-10);
    const bookings = await db
      .collection(COLLECTIONS.bookings)
      .find({
        phone: { $regex: `${phoneSuffix}$` },
      })
      .sort({ date: -1, time: -1 })
      .toArray();

    // Fetch live queue snapshot for today
    const today = todayISO();
    const queueSnapshot = await getPublicQueueSnapshot(today);

    // Find any active queue entry for this patient today
    const queueEntries = await db
      .collection(COLLECTIONS.queue)
      .find({
        date: today,
        phone: { $regex: `${phoneSuffix}$` },
      })
      .toArray();

    return NextResponse.json({
      bookings: bookings.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() })),
      queueSnapshot,
      activeQueueEntries: queueEntries.map(({ _id, ...e }) => ({ ...e, _id: _id?.toString() })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load user data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

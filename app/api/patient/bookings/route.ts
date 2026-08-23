import { NextRequest, NextResponse } from 'next/server';
import { getPatientById } from '@/lib/db/patients';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get('patientId')?.value;

    if (!patientId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const patient = await getPatientById(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const db = await getDb();
    const bookings = await db.collection(COLLECTIONS.bookings)
      .find({ phone: patient.phone })
      .sort({ date: -1, time: -1 })
      .toArray();

    // Map _id to id for client components
    const formattedBookings = bookings.map(b => ({
      ...b,
      id: b.id,
      _id: b._id?.toString(),
    }));

    return NextResponse.json({ bookings: formattedBookings });
  } catch (err: any) {
    console.error('Patient Bookings Error:', err);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

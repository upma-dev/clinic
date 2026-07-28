import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTelemedicineAppointmentsByPatient } from '@/lib/db/telemedicine';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

import { getPatientSession } from '@/lib/patientAuth';

export async function GET() {
  try {
    const session = await getPatientSession();
    
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { phone } = session;

    // Find patient by phone
    const db = await getDb();
    const patientDoc = await db.collection(COLLECTIONS.patients).findOne({ phone });

    let appointments = [];
    
    // We match telemedicine bookings by phone since patientId might not have been set yet
    const rawAppointments = await db.collection(COLLECTIONS.telemedicine_appointments)
      .find({ phone })
      .sort({ createdAt: -1 })
      .toArray();
      
    appointments = rawAppointments.map(a => ({ ...a, _id: a._id.toString() }));

    return NextResponse.json({ 
      success: true, 
      appointments,
      patientId: patientDoc?._id?.toString() || null
    });
  } catch (error: any) {
    console.error('Telemedicine fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

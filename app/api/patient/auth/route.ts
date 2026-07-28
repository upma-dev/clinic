import { NextRequest, NextResponse } from 'next/server';
import { getOrCreatePatient } from '@/lib/db/patients';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { phone, name } = await req.json();
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
    }

    const patient = await getOrCreatePatient(phone, name);

    // Set simple cookie session for Phase 1
    const cookieStore = await cookies();
    cookieStore.set('patientId', patient.id, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return NextResponse.json({ success: true, patient });
  } catch (err: any) {
    console.error('Patient Auth Error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('patientId');
  return NextResponse.json({ success: true });
}

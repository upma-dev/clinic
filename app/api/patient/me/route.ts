import { NextRequest, NextResponse } from 'next/server';
import { getPatientById } from '@/lib/db/patients';
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

    return NextResponse.json({ patient });
  } catch (err: any) {
    console.error('Patient Me Error:', err);
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 });
  }
}

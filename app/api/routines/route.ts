import { NextRequest, NextResponse } from 'next/server';
import { createRoutine, getPatientRoutines, getPatientRoutineLogsForDate } from '@/lib/db/routines';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function getPatientId(cookieStore: any) {
  return cookieStore.get('patientId')?.value;
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientId = getPatientId(cookieStore);
    if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const routines = await getPatientRoutines(patientId);
    const logs = await getPatientRoutineLogsForDate(patientId, date);

    return NextResponse.json({ routines, logs });
  } catch (err: any) {
    console.error('Fetch Routines Error:', err);
    return NextResponse.json({ error: 'Failed to fetch routines' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientId = getPatientId(cookieStore);
    if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    
    if (!data.name || !data.category || !data.time || !data.repeat) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const routine = {
      id: crypto.randomUUID(),
      patientId,
      name: data.name,
      category: data.category,
      time: data.time,
      repeat: data.repeat,
      notes: data.notes || '',
      reminderEnabled: data.reminderEnabled || false,
      createdAt: new Date().toISOString()
    };

    const saved = await createRoutine(routine);

    return NextResponse.json({ success: true, routine: saved }, { status: 201 });
  } catch (err: any) {
    console.error('Create Routine Error:', err);
    return NextResponse.json({ error: 'Failed to create routine' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { toggleRoutineLog } from '@/lib/db/routines';
import { cookies } from 'next/headers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get('patientId')?.value;
    if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { date } = await req.json();

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const completed = await toggleRoutineLog(patientId, id, date);

    return NextResponse.json({ success: true, completed });
  } catch (err: any) {
    console.error('Toggle Routine Log Error:', err);
    return NextResponse.json({ error: 'Failed to toggle log' }, { status: 500 });
  }
}

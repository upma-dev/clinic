import { NextRequest, NextResponse } from 'next/server';
import { deleteRoutine } from '@/lib/db/routines';
import { cookies } from 'next/headers';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get('patientId')?.value;
    if (!patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const success = await deleteRoutine(id, patientId);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete or not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete Routine Error:', err);
    return NextResponse.json({ error: 'Failed to delete routine' }, { status: 500 });
  }
}

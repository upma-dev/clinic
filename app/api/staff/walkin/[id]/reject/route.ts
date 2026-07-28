import { NextRequest, NextResponse } from 'next/server';
import { updateWalkInStatus, getWalkInRequestById } from '@/lib/db/walkin';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const request = await getWalkInRequestById(id);
    
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    await updateWalkInStatus(id, 'Rejected');

    return NextResponse.json({ success: true, message: 'Status updated to Rejected.' });
  } catch (err: any) {
    console.error('Walkin Reject Error:', err);
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }
}

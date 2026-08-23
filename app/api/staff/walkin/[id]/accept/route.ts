import { NextRequest, NextResponse } from 'next/server';
import { updateWalkInStatus, getWalkInRequestById } from '@/lib/db/walkin';
import { getSession } from '@/lib/auth';
import { sendEmail, templates } from '@/lib/email';

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

    await updateWalkInStatus(id, 'Accepted');

    await sendEmail({
      to: request.mobile + '@mock.com', // In reality, we'd collect an email address if they wanted emails
      subject: 'Walk-in Request Accepted - Skin-Hub Clinic',
      html: templates.walkinAccepted(request.fullName, new Date().toISOString())
    });

    return NextResponse.json({ success: true, message: 'Status updated to Accepted and email sent.' });
  } catch (err: any) {
    console.error('Walkin Accept Error:', err);
    return NextResponse.json({ error: 'Failed to accept' }, { status: 500 });
  }
}

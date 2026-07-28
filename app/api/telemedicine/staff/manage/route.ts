import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { MeetingService } from '@/lib/services/MeetingService';
import { NotificationService } from '@/lib/services/NotificationService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const db = await getDb();
    const rawAppointments = await db.collection(COLLECTIONS.telemedicine_appointments)
      .find(status === 'all' ? {} : { status })
      .sort({ createdAt: -1 })
      .toArray();

    const appointments = rawAppointments.map(a => ({ ...a, _id: a._id.toString() }));

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { action, appointmentId, patientName, email, date, time } = data;

    const db = await getDb();

    if (action === 'confirm') {
      // 1. Generate Meeting Link
      const meeting = MeetingService.generateMeeting(appointmentId, patientName);

      // 2. Update DB
      await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
        { _id: new ObjectId(appointmentId) },
        { 
          $set: { 
            status: 'confirmed',
            meetingProvider: meeting.provider,
            meetingId: meeting.roomId,
            meetingUrl: meeting.meetingUrl,
            updatedAt: new Date().toISOString()
          } 
        }
      );

      // 3. Send Notification
      await NotificationService.sendAppointmentConfirmed(email, patientName, date, time, meeting.meetingUrl);

      return NextResponse.json({ success: true, meeting });
    }

    if (action === 'cancel') {
      await db.collection(COLLECTIONS.telemedicine_appointments).updateOne(
        { _id: new ObjectId(appointmentId) },
        { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}

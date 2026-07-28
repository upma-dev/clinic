import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getClinicSettings } from '@/lib/db/settings';
import { updateDailyQueue } from '@/lib/db/queue';
import { createNotification } from '@/lib/db/notifications';
import { todayISO } from '@/lib/slots';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { delayMinutes } = body;

    if (!delayMinutes || isNaN(Number(delayMinutes))) {
      return NextResponse.json({ error: 'Valid delayMinutes parameter required' }, { status: 400 });
    }

    const todayStr = todayISO();
    const db = await getDb();
    const settings = await getClinicSettings();

    // 1. Fetch today's active appointments
    const activeBookings = await db.collection(COLLECTIONS.bookings).find({
      date: todayStr,
      status: { $in: ['confirmed', 'pending', 'checked-in'] }
    }).toArray();

    // 2. Broadcast live queue delay message
    const delayMsg = `Dr. ${settings.doctorName || 'Prateek Tiwari'} is running delayed by ${delayMinutes} minutes today. We apologize for the inconvenience.`;
    await updateDailyQueue(todayStr, {
      message: delayMsg,
      lastUpdated: new Date().toISOString()
    });

    await createNotification(
      'queue_update',
      'Doctor Schedule Delayed',
      `Dr. ${settings.doctorName || 'Prateek Tiwari'} declared a schedule delay of ${delayMinutes} minutes today.`
    );

    // 3. Send automated emails to patients
    const { sendAutomatedEmail } = await import('@/lib/email');
    let emailCount = 0;
    
    for (const b of activeBookings) {
      if (b.email) {
        await sendAutomatedEmail(b.email, 'doctorDelayed', {
          name: b.name,
          delayMinutes,
          doctorName: settings.doctorName || 'Dr. Prateek Tiwari'
        }).catch(err => console.error(`Failed to send delay email to ${b.email}:`, err));
        emailCount++;
      }
    }

    return NextResponse.json({ success: true, notifiedCount: activeBookings.length, emailsSent: emailCount });
  } catch (error) {
    console.error('Error declaring doctor delay:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

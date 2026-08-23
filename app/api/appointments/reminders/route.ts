import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getClinicSettings } from '@/lib/db/settings';
import { todayISO } from '@/lib/slots';

export async function GET(req: NextRequest) {
  try {
    // Can be called by cron or admin session
    const session = await getSession();
    const isCron = req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`;

    if (!session && !isCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStr = todayISO();
    const db = await getDb();
    const settings = await getClinicSettings();
    const reminderThresholdMinutes = settings.reminderTimeMinutes || 60;

    // Fetch confirmed bookings for today that haven't received a reminder
    const bookings = await db.collection(COLLECTIONS.bookings).find({
      date: todayStr,
      status: 'confirmed',
      reminderSent: { $ne: true }
    }).toArray();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const { sendAutomatedEmail } = await import('@/lib/email');
    let sentCount = 0;

    for (const b of bookings) {
      if (!b.time) continue;
      
      // Parse slot time e.g., "10:30"
      const [hour, minute] = b.time.split(':').map(Number);
      const slotTimeInMinutes = hour * 60 + minute;
      const difference = slotTimeInMinutes - currentTimeInMinutes;

      // Send reminder if slot is approaching and within the threshold
      if (difference > 0 && difference <= reminderThresholdMinutes) {
        if (b.email) {
          await sendAutomatedEmail(b.email, 'reminderBefore', {
            name: b.name,
            time: b.time
          }).catch(err => console.error('Failed to send reminder:', err));
        }

        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: b.id },
          { $set: { reminderSent: true } }
        );
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, remindersSent: sentCount });
  } catch (error) {
    console.error('Error running reminders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

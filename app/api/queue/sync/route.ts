import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { getQueueEntries, getNextTokenNumber, addQueueEntry, updateDailyQueue } from '@/lib/db/queue';
import { todayISO } from '@/lib/slots';
import type { Booking, QueueEntry, QueueEntryStatus } from '@/lib/types';

/**
 * POST /api/queue/sync
 * Auto-syncs today's confirmed/booked appointments into the queue.
 * Also detects late patients (slot time passed) and moves them to end.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const date = todayISO();
    const db = await getDb();

    // 1. Fetch today's bookings that are confirmed, booked, or arrived
    const todayBookings = await db
      .collection<Booking>(COLLECTIONS.bookings)
      .find({
        date,
        status: { $in: ['confirmed', 'booked', 'arrived', 'checked-in'] },
      })
      .toArray();

    // 2. Get existing queue entries for today
    const existingEntries = await getQueueEntries(date);
    const existingBookingIds = new Set(existingEntries.map(e => e.bookingId).filter(Boolean));

    let added = 0;

    // 3. Add bookings not yet in queue
    for (const booking of todayBookings) {
      if (existingBookingIds.has(booking.id)) continue; // Already in queue

      const tokenNumber = await getNextTokenNumber(date);
      const entry: QueueEntry = {
        date,
        tokenNumber,
        name: booking.name,
        phone: booking.phone,
        source: booking.source || 'online',
        bookingId: booking.id,
        status: 'waiting',
        priority: 0,
        estimatedWaitMinutes: 0,
        scheduledTime: booking.time,
        createdAt: new Date().toISOString(),
      };
      await addQueueEntry(entry);
      added++;
    }

    // 4. Late patient detection:
    //    If scheduled time has passed by 30+ min AND patient is still 'waiting' → skip to end
    const now = new Date();
    const allEntries = await getQueueEntries(date);

    let lateSkipped = 0;

    for (const entry of allEntries) {
      if (entry.status !== 'waiting') continue;
      if (!entry.scheduledTime) continue;

      // Parse scheduled time (e.g. "09:15 AM")
      const [timePart, meridiem] = entry.scheduledTime.split(' ');
      const [hourStr, minStr] = timePart.split(':');
      let hours = parseInt(hourStr, 10);
      const minutes = parseInt(minStr, 10);
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      const diffMinutes = (now.getTime() - scheduledDate.getTime()) / (1000 * 60);

      if (diffMinutes > 30) {
        // Find max priority in waiting queue and push this patient past all
        const maxPriorityEntry = allEntries
          .filter(e => e.status === 'waiting')
          .reduce((max, e) => ((e.priority ?? 0) > (max.priority ?? 0) ? e : max), allEntries[0]);
        const maxPriority = maxPriorityEntry?.priority ?? 0;

        await db.collection(COLLECTIONS.queue).updateOne(
          { date, tokenNumber: entry.tokenNumber },
          { $set: { status: 'waiting' as QueueEntryStatus, priority: maxPriority + 100 } }
        );
        lateSkipped++;
      }
    }

    // 5. Update total patients count
    const finalEntries = await getQueueEntries(date);
    await updateDailyQueue(date, {
      totalPatientsToday: finalEntries.length,
    });

    return NextResponse.json({
      success: true,
      added,
      lateSkipped,
      total: finalEntries.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

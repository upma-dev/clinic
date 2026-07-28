import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getDailyQueue, updateDailyQueue, getQueueEntries, advanceQueue, 
  updateQueueEntryStatus, setEmergencyPriority, reorderQueueEntries, 
  removeQueueEntry, addQueueEntry, getNextTokenNumber 
} from '@/lib/db/queue';
import { updateBookingStatus } from '@/lib/db/bookings';
import { createNotification } from '@/lib/db/notifications';
import { todayISO } from '@/lib/slots';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import type { QueueEntry } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, bookingId, tokenNumber, date = todayISO(), name, phone, message, reorderList, nextScheduleDate } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'next': {
        const result = await advanceQueue(date);
        const nowServing = result.next ? result.next.name : 'None';
        await createNotification(
          'queue_update',
          'Queue Advanced',
          `Queue advanced. Now serving: ${nowServing}.`
        );
        return NextResponse.json({ success: true, currentToken: result.queue.currentToken });
      }

      case 'skip': {
        if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        await updateQueueEntryStatus(date, bookingId, 'skipped');
        await updateBookingStatus(bookingId, 'no-show');
        await createNotification(
          'queue_update',
          'Patient Skipped',
          `Booking ${bookingId} was marked as Skipped.`
        );
        return NextResponse.json({ success: true });
      }

      case 'skip_to_end': {
        // Skip current patient and push to the END of waiting list
        if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        
        const db = await getDb();
        // Find the max priority in current waiting list to push this patient past all others
        const allWaiting = await db.collection<QueueEntry>(COLLECTIONS.queue)
          .find({ date, status: { $in: ['waiting', 'serving', 'consulting'] } })
          .sort({ priority: -1 })
          .limit(1)
          .toArray();
        
        const maxPriority = allWaiting.length ? (allWaiting[0].priority ?? 0) : 0;
        
        // Set back to waiting with max+1 priority (goes to end)
        await db.collection(COLLECTIONS.queue).updateOne(
          { date, bookingId },
          { $set: { status: 'waiting', priority: maxPriority + 100 } }
        );

        // Advance queue to next patient
        const nextEntry = await db.collection<QueueEntry>(COLLECTIONS.queue)
          .findOne({ date, status: 'waiting' }, { sort: { priority: 1, createdAt: 1 } });

        if (nextEntry) {
          await db.collection(COLLECTIONS.queue).updateOne(
            { date, bookingId: nextEntry.bookingId },
            { $set: { status: 'serving' } }
          );
          if (nextEntry.bookingId) {
            await updateBookingStatus(nextEntry.bookingId, 'arrived');
          }
        }

        const waitingCount = await db.collection(COLLECTIONS.queue).countDocuments({ date, status: 'waiting' });
        await updateDailyQueue(date, {
          estimatedWaitMinutes: waitingCount * 15,
          congestion: waitingCount > 8 ? 'red' : waitingCount > 4 ? 'yellow' : 'green',
        });

        await createNotification(
          'queue_update',
          'Patient Moved to End',
          `Booking ${bookingId} was skipped and moved to end of queue.`
        );
        return NextResponse.json({ success: true });
      }


      case 'pause': {
        if (session.role !== 'doctor') return NextResponse.json({ error: 'Only doctor can pause queue' }, { status: 403 });
        await updateDailyQueue(date, { status: 'paused' });
        await createNotification(
          'queue_update',
          'Queue Paused',
          'The consultation queue has been paused by the doctor.'
        );
        return NextResponse.json({ success: true });
      }

      case 'resume': {
        if (session.role !== 'doctor') return NextResponse.json({ error: 'Only doctor can resume queue' }, { status: 403 });
        await updateDailyQueue(date, { status: 'active' });
        await createNotification(
          'queue_update',
          'Queue Resumed',
          'The consultation queue has been resumed.'
        );
        return NextResponse.json({ success: true });
      }

      case 'away': {
        if (session.role !== 'doctor') return NextResponse.json({ error: 'Only doctor can set status' }, { status: 403 });
        await updateDailyQueue(date, { status: 'away' });
        await createNotification(
          'queue_update',
          'Doctor Status Away',
          'The doctor is temporarily away.'
        );
        return NextResponse.json({ success: true });
      }

      case 'start': {
        if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        await updateQueueEntryStatus(date, bookingId, 'consulting');
        await updateBookingStatus(bookingId, 'arrived');

        await createNotification(
          'queue_update',
          'Consultation Started',
          `Consultation started for Booking #${bookingId}.`
        );
        return NextResponse.json({ success: true });
      }

      case 'complete': {
        if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        await updateQueueEntryStatus(date, bookingId, 'done');
        await updateBookingStatus(bookingId, 'completed');
        
        if (nextScheduleDate) {
          const db = await getDb();
          await db.collection(COLLECTIONS.bookings).updateOne(
            { id: bookingId },
            { $set: { nextScheduleDate } }
          );

          // Automatically send follow-up reminder email
          const booking = await db.collection(COLLECTIONS.bookings).findOne({ id: bookingId });
          if (booking && booking.email) {
            const { sendAutomatedEmail } = await import('@/lib/email');
            const settings = await db.collection(COLLECTIONS.settings).findOne({});
            await sendAutomatedEmail(booking.email, 'followUp', {
              name: booking.name,
              date: nextScheduleDate,
              doctorName: settings?.doctorName || 'Dr. Prateek Tiwari',
              address: settings?.clinicAddress || 'Clinic Address'
            }).catch(err => console.error('Failed to send follow-up email:', err));
          }
        }

        await createNotification(
          'payment_received',
          'Consultation Completed',
          `Booking #${bookingId} consultation completed.${nextScheduleDate ? ` Next follow-up: ${nextScheduleDate}` : ''}`
        );
        return NextResponse.json({ success: true });
      }

      case 'send_back': {
        if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        await updateQueueEntryStatus(date, bookingId, 'waiting');
        await createNotification(
          'queue_update',
          'Patient Sent Back',
          `Booking #${bookingId} was put back into the waiting queue lobby.`
        );
        return NextResponse.json({ success: true });
      }

      case 'emergency': {
        if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        await setEmergencyPriority(date, bookingId);
        await createNotification(
          'queue_update',
          'Emergency Priority Set',
          `Booking #${bookingId} was marked as EMERGENCY. Position moved to next in line.`
        );
        return NextResponse.json({ success: true });
      }

      case 'reorder': {
        if (!reorderList || !Array.isArray(reorderList)) {
          return NextResponse.json({ error: 'reorderList array required' }, { status: 400 });
        }
        await reorderQueueEntries(date, reorderList);
        await createNotification(
          'queue_update',
          'Queue Reordered',
          'The queue wait-list order was manually adjusted.'
        );
        return NextResponse.json({ success: true });
      }

      case 'add_walkin': {
        if (!name) return NextResponse.json({ error: 'Patient name required' }, { status: 400 });
        const walkInId = `WALK-${Math.floor(10000 + Math.random() * 90000)}`;
        await addQueueEntry({
          date,
          name,
          phone: phone || '',
          source: 'walk-in',
          bookingId: walkInId,
          status: 'waiting',
          estimatedWaitMinutes: 0,
          createdAt: new Date().toISOString(),
        });
        await createNotification(
          'booking_new',
          'New Walk-in Registered',
          `Walk-in registered: ${name}.`
        );
        return NextResponse.json({ success: true, bookingId: walkInId });
      }

      case 'remove': {
        if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
        await removeQueueEntry(date, bookingId);
        await createNotification(
          'queue_update',
          'Patient Removed',
          `Booking #${bookingId} was removed from the queue.`
        );
        return NextResponse.json({ success: true });
      }

      case 'broadcast': {
        await updateDailyQueue(date, { message });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Queue Control Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

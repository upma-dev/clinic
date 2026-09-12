import { getDb, COLLECTIONS } from '../mongodb';
import type { Booking, BookingStatus, PaymentStatus } from '../types';
import { todayISO, timeToMinutes } from '../slots';

export async function autoSkipOverdueBookings(dbInstance?: any): Promise<number> {
  try {
    const db = dbInstance || (await getDb());
    const today = todayISO();

    // Current time in minutes from midnight (IST)
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
    const [hStr, mStr] = istTimeStr.split(':');
    const currentMins = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);

    // 15-minute grace period after slot time before auto-skipping
    const GRACE_PERIOD_MINUTES = 15;

    const candidates = (await db
      .collection(COLLECTIONS.bookings)
      .find({
        date: { $lte: today },
        status: { $in: ['confirmed', 'booked'] },
      })
      .toArray()) as Booking[];

    if (candidates.length === 0) return 0;

    let skippedCount = 0;
    const nowIso = new Date().toISOString();

    for (const b of candidates) {
      let isOverdue = false;
      if (b.date < today) {
        // Any past date confirmed booking where patient never arrived is overdue
        isOverdue = true;
      } else if (b.date === today && b.time) {
        const slotMins = timeToMinutes(b.time);
        if (slotMins > 0 && currentMins >= (slotMins + GRACE_PERIOD_MINUTES)) {
          isOverdue = true;
        }
      }

      if (isOverdue) {
        await db.collection(COLLECTIONS.bookings).updateOne(
          { id: b.id },
          {
            $set: {
              status: 'no-show',
              skippedAt: nowIso,
              rescheduleReason: 'Auto-skipped: Patient did not arrive within scheduled slot time (+15m grace).'
            }
          }
        );

        // Also update queue entry if present
        await db.collection(COLLECTIONS.queue).updateOne(
          { bookingId: b.id },
          { $set: { status: 'skipped' } }
        );

        skippedCount++;
      }
    }

    return skippedCount;
  } catch (err) {
    console.error('Failed to auto-skip overdue bookings:', err);
    return 0;
  }
}

let lastCleanupTime = 0;

export async function cleanupExpiredUnpaidBookings(dbInstance?: any): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupTime < 60000) return;
  lastCleanupTime = now;

  try {
    const db = dbInstance || (await getDb());
    const nowIso = new Date().toISOString();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    await db.collection(COLLECTIONS.bookings).updateMany(
      {
        payOnline: true,
        paymentStatus: { $nin: ['paid', 'Paid'] },
        status: { $nin: ['cancelled', 'confirmed'] },
        $or: [
          { holdExpiresAt: { $lte: nowIso } },
          { holdExpiresAt: { $exists: false }, createdAt: { $lt: fifteenMinutesAgo } }
        ]
      },
      {
        $set: {
          status: 'cancelled',
          paymentStatus: 'failed',
          cancellationReason: 'Payment session expired (15-minute hold timed out)',
          notes: 'Cancelled automatically: Payment not completed within 15 minutes.'
        }
      }
    );

    // Also auto-skip overdue confirmed bookings whose time has passed
    await autoSkipOverdueBookings(db);
  } catch (err) {
    console.error('Failed to cleanup expired unpaid bookings:', err);
  }
}

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  try {
    const db = await getDb();
    cleanupExpiredUnpaidBookings(db).catch(() => {});
    const nowIso = new Date().toISOString();

    const docs = await db
      .collection<Booking>(COLLECTIONS.bookings)
      .find({
        date,
        status: { $nin: ['cancelled', 'no-show'] },
        $or: [
          { status: { $in: ['confirmed', 'booked', 'checked-in', 'arrived', 'completed'] } },
          { paymentStatus: { $in: ['paid', 'Paid'] } },
          {
            payOnline: true,
            paymentStatus: { $nin: ['paid', 'Paid', 'failed', 'Failed'] },
            holdExpiresAt: { $gt: nowIso }
          }
        ]
      })
      .sort({ time: 1 })
      .toArray();
    return docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));
  } catch (e) {
    console.error('Failed to fetch bookings by date:', e);
    return [];
  }
}

export async function getAllBookingsForDate(date: string): Promise<Booking[]> {
  try {
    const db = await getDb();
    cleanupExpiredUnpaidBookings(db).catch(() => {});
    const docs = await db
      .collection<Booking>(COLLECTIONS.bookings)
      .find({ date })
      .sort({ time: 1 })
      .toArray();
    return docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));
  } catch (e) {
    console.error('Failed to fetch all bookings for date:', e);
    return [];
  }
}

export async function getAllBookings(limit = 2000): Promise<Booking[]> {
  try {
    const db = await getDb();
    cleanupExpiredUnpaidBookings(db).catch(() => {});
    const docs = await db
      .collection<Booking>(COLLECTIONS.bookings)
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));
  } catch (e) {
    console.error('Failed to fetch all bookings:', e);
    return [];
  }
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const db = await getDb();
  const doc = await db.collection<Booking>(COLLECTIONS.bookings).findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: _id?.toString() };
}

export async function countBookingsForDate(date: string, type?: 'clinic' | 'online'): Promise<number> {
  try {
    const db = await getDb();
    cleanupExpiredUnpaidBookings(db).catch(() => {});
    const nowIso = new Date().toISOString();

    const query: any = {
      date,
      status: { $nin: ['cancelled', 'no-show'] },
      $or: [
        { status: { $in: ['confirmed', 'booked', 'checked-in', 'arrived', 'completed'] } },
        { paymentStatus: { $in: ['paid', 'Paid'] } },
        {
          payOnline: true,
          paymentStatus: { $nin: ['paid', 'Paid', 'failed', 'Failed'] },
          holdExpiresAt: { $gt: nowIso }
        }
      ]
    };

    if (type === 'online') {
      query.bookingType = 'online';
    } else if (type === 'clinic') {
      query.bookingType = { $ne: 'online' };
    }

    return await db.collection(COLLECTIONS.bookings).countDocuments(query);
  } catch (e) {
    console.error('Failed to count bookings for date:', e);
    return 0;
  }
}

export async function isSlotTaken(date: string, time: string, excludeBookingId?: string): Promise<boolean> {
  try {
    const db = await getDb();
    await cleanupExpiredUnpaidBookings(db);
    const nowIso = new Date().toISOString();

    const query: any = {
      date,
      time,
      status: { $nin: ['cancelled', 'no-show'] },
      $or: [
        { status: { $in: ['confirmed', 'booked', 'checked-in', 'arrived', 'completed'] } },
        { paymentStatus: { $in: ['paid', 'Paid'] } },
        {
          payOnline: true,
          paymentStatus: { $nin: ['paid', 'Paid', 'failed', 'Failed'] },
          holdExpiresAt: { $gt: nowIso }
        }
      ]
    };

    if (excludeBookingId) {
      query.id = { $ne: excludeBookingId };
    }

    const existingBooking = await db.collection(COLLECTIONS.bookings).findOne(query);
    if (existingBooking) return true;

    // Also check confirmed telemedicine appointments
    const teleQuery: any = {
      preferredDate: date,
      preferredTimeSlot: time,
      status: { $in: ['confirmed', 'booked', 'completed'] }
    };
    if (excludeBookingId) {
      teleQuery.appointmentId = { $ne: excludeBookingId };
    }
    const existingTele = await db.collection(COLLECTIONS.telemedicine_appointments).findOne(teleQuery);
    return !!existingTele;
  } catch (e) {
    console.error('Failed to check if slot is taken:', e);
    return false;
  }
}

export async function createBooking(booking: Booking): Promise<Booking> {
  const db = await getDb();
  const { _id, ...doc } = booking;
  await db.collection(COLLECTIONS.bookings).insertOne(doc);
  return booking;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection(COLLECTIONS.bookings)
    .updateOne({ id }, { $set: { status } });
  return result.modifiedCount > 0;
}

export async function updateBookingPayment(
  id: string,
  paymentUpdate: {
    paymentStatus: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    amountPaid?: number;
    refundId?: string;
    refundedAt?: string;
  }
) {
  const db = await getDb();
  await db.collection(COLLECTIONS.bookings).updateOne(
    { id },
    {
      $set: {
        ...paymentUpdate,
        payOnline: true
      }
    }
  );
}

export async function deleteBooking(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.bookings).deleteOne({ id });
  return result.deletedCount > 0;
}

export async function getBookedTimesForDate(date: string): Promise<Set<string>> {
  const bookings = await getBookingsByDate(date);
  return new Set(bookings.map((b) => b.time));
}

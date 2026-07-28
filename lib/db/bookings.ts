import { getDb, COLLECTIONS } from '../mongodb';
import type { Booking, BookingStatus, PaymentStatus } from '../types';

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const db = await getDb();
  const docs = await db
    .collection<Booking>(COLLECTIONS.bookings)
    .find({ date, status: { $nin: ['cancelled', 'no-show'] } })
    .sort({ time: 1 })
    .toArray();
  return docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));
}

export async function getAllBookings(limit = 100): Promise<Booking[]> {
  const db = await getDb();
  const docs = await db
    .collection<Booking>(COLLECTIONS.bookings)
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const db = await getDb();
  const doc = await db.collection<Booking>(COLLECTIONS.bookings).findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: _id?.toString() };
}

export async function countBookingsForDate(date: string): Promise<number> {
  const db = await getDb();
  return db.collection(COLLECTIONS.bookings).countDocuments({
    date,
    status: { $nin: ['cancelled', 'no-show'] },
  });
}

export async function isSlotTaken(date: string, time: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.collection(COLLECTIONS.bookings).findOne({
    date,
    time,
    status: { $nin: ['cancelled', 'no-show'] },
  });
  return !!existing;
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

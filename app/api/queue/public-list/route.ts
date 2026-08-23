import { NextResponse } from 'next/server';
import { getBookingsByDate } from '@/lib/db/bookings';
import { getQueueEntries } from '@/lib/db/queue';
import { todayISO } from '@/lib/slots';

export async function GET() {
  try {
    const date = todayISO();
    const [bookings, queueEntries] = await Promise.all([
      getBookingsByDate(date),
      getQueueEntries(date),
    ]);

    const onlineBookings = bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'arrived')
      .map((b) => ({
        id: b.id,
        patientInitials: b.name
          .split(' ')
          .map((n) => n.charAt(0))
          .join('')
          .slice(0, 2),
        serviceName: b.service,
        time: b.time,
        tokenNumber: b.tokenNumber,
      }));

    const walkIns = queueEntries
      .filter((e) => e.source === 'walk-in' && e.status !== 'done')
      .map((e) => ({
        id: e.bookingId || `T-${e.tokenNumber}`,
        patientInitials: e.name
          .split(' ')
          .map((n) => n.charAt(0))
          .join('')
          .slice(0, 2),
        serviceName: 'Walk-in',
        time: `Token #${e.tokenNumber}`,
        tokenNumber: e.tokenNumber,
      }));

    return NextResponse.json([...onlineBookings, ...walkIns]);
  } catch {
    return NextResponse.json([]);
  }
}

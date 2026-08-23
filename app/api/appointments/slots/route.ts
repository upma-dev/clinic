import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  countBookingsForDate,
  getBookedTimesForDate,
  getAllBookings,
} from '@/lib/db/bookings';
import { getClinicSettings } from '@/lib/db/settings';
import { buildSlotAvailability } from '@/lib/slots';

/** Public: available slots for a date */
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'date parameter required (YYYY-MM-DD)' }, { status: 400 });
    }

    const typeParam = req.nextUrl.searchParams.get('type') || 'online';
    const type = (typeParam === 'offline' || typeParam === 'clinic') ? 'clinic' : 'online';

    const settings = await getClinicSettings();
    const [bookedTimes, totalBookings] = await Promise.all([
      getBookedTimesForDate(date),
      countBookingsForDate(date),
    ]);

    const blockedTimes = new Set(
      settings.blockedSlots.filter((s) => s.date === date).map((s) => s.time)
    );

    const result = buildSlotAvailability(
      date,
      settings,
      bookedTimes,
      blockedTimes,
      totalBookings,
      type
    );

    return NextResponse.json({
      date,
      maxBookingsPerDay: settings.maxBookingsPerDay,
      bookedCount: totalBookings,
      cutoff: `${settings.bookingCutoffHour}:${String(settings.bookingCutoffMinute).padStart(2, '0')}`,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load slots';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Admin: list today's bookings */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { date } = await req.json().catch(() => ({}));
  const targetDate = date || new Date().toISOString().split('T')[0];

  if (session.role === 'staff' || session.role === 'doctor') {
    const { getBookingsByDate } = await import('@/lib/db/bookings');
    const list = date ? await getBookingsByDate(targetDate) : await getAllBookings();
    return NextResponse.json(list);
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

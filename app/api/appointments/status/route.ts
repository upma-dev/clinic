import { NextRequest, NextResponse } from 'next/server';
import { getBookingById } from '@/lib/db/bookings';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      tokenNumber: booking.tokenNumber
    });
  } catch (error) {
    console.error('Error fetching booking status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

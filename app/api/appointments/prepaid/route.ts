import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { Booking } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    const db = await getDb();
    
    let query: any = { 
      paymentStatus: 'paid', 
      status: { $nin: ['cancelled', 'no-show', 'completed'] } 
    };

    if (date) {
      query.date = date;
    }

    const docs = await db
      .collection<Booking>(COLLECTIONS.bookings)
      .find(query)
      .sort({ time: 1 })
      .toArray();
      
    const bookings = docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() }));

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching prepaid clinic appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

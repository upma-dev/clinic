import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { addQueueEntry, getNextTokenNumber, getDailyQueue } from '@/lib/db/queue';
import { createBooking } from '@/lib/db/bookings';
import type { Booking } from '@/lib/types';
import { todayISO } from '@/lib/slots';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

/** Staff: register walk-in patient with full intake form */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'staff') {
      return NextResponse.json({ error: 'Staff login required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      email,
      service,
      gender,
      age,
      address,
      skinType,
      problemDescription,
      previousMedication,
      appointmentNotes,
      time,
      paymentMethod,
    } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const date = todayISO();
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const uniqueId = Math.floor(10000 + Math.random() * 90000);
    const walkInId = `WALK-${uniqueId}`;

    const selectedTime = time || currentTime;

    // Full booking record with all intake fields
    const booking: Booking = {
      id: walkInId,
      name,
      phone,
      email: email || '',
      service: service || 'General Consultation',
      date,
      time: selectedTime,
      status: 'confirmed',
      source: 'walk-in',
      payOnline: paymentMethod === 'online',
      paymentStatus: 'paid',
      paymentMethod: paymentMethod || 'cash',
      gender: gender || 'Male',
      age: age ? Number(age) : undefined,
      address: address || '',
      skinType: skinType || 'Normal',
      problemDescription: problemDescription || '',
      previousMedication: previousMedication || '',
      appointmentNotes: appointmentNotes || '',
      createdAt: new Date().toISOString(),
    };

    await createBooking(booking);

    await addQueueEntry({
      date,
      name,
      phone,
      source: 'walk-in',
      bookingId: walkInId,
      status: 'waiting',
      priority: 0,
      estimatedWaitMinutes: 0,
      scheduledTime: selectedTime,
      createdAt: new Date().toISOString(),
    });

    const queue = await getDailyQueue(date);

    // Get clinic settings for WhatsApp message
    const db = await getDb();
    const settings = await db.collection(COLLECTIONS.settings).findOne({});
    const clinicName = settings?.clinicName || 'Skin Hub Clinic';
    const clinicAddress = settings?.clinicAddress || 'Freeganj, Ujjain';

    const waText = `*${clinicName} — Walk-in Registered* 🏥\n\nHello ${name}!\n\nService: ${service || 'General Consultation'}\nEstimated Wait: ~${queue.estimatedWaitMinutes} minutes\nLocation: ${clinicAddress}\n\nPlease be seated in the lobby. We will call you soon!`;

    const sanitizedPhone = phone.replace(/\D/g, '').slice(-10);
    const whatsappUrl = `https://wa.me/91${sanitizedPhone}?text=${encodeURIComponent(waText)}`;

    return NextResponse.json({
      success: true,
      tokenNumber: undefined,
      bookingId: walkInId,
      estimatedWaitMinutes: queue.estimatedWaitMinutes,
      whatsappUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Walk-in registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

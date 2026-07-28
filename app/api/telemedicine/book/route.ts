import { NextResponse } from 'next/server';
import { createTelemedicineAppointment } from '@/lib/db/telemedicine';
import { NotificationService } from '@/lib/services/NotificationService';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 1. Basic validation
    if (!data.name || !data.phone || !data.email || !data.preferredDate || !data.preferredTimeSlot || !data.chiefComplaint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Save to database
    const appointment = await createTelemedicineAppointment({
      name: data.name,
      phone: data.phone,
      email: data.email,
      age: data.age,
      gender: data.gender,
      city: data.city,
      state: data.state,
      preferredDate: data.preferredDate,
      preferredTimeSlot: data.preferredTimeSlot,
      chiefComplaint: data.chiefComplaint,
      symptomsDuration: data.symptomsDuration,
      previousMedicalHistory: data.previousMedicalHistory || '',
      preferredLanguage: data.preferredLanguage || 'English',
      // We will match patientId later if they are already registered
      patientId: undefined 
    });

    // 3. Send Notification Email to patient
    await NotificationService.sendBookingReceived(appointment.email, appointment.name);

    return NextResponse.json({ success: true, appointmentId: appointment._id });
  } catch (error: any) {
    console.error('Telemedicine Booking Error:', error);
    return NextResponse.json({ error: 'Failed to process booking request' }, { status: 500 });
  }
}

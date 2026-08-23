import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClinicSettings, updateClinicSettings } from '@/lib/db/settings';

export async function GET() {
  try {
    const settings = await getClinicSettings();
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Settings unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'doctor') {
      return NextResponse.json({ error: 'Doctor login required' }, { status: 401 });
    }

    const body = await req.json();
    const patch: Record<string, any> = {};

    // Standard settings
    if (body.clinicName !== undefined) patch.clinicName = body.clinicName;
    if (body.clinicLogo !== undefined) patch.clinicLogo = body.clinicLogo;
    if (body.clinicAddress !== undefined) patch.clinicAddress = body.clinicAddress;
    if (body.clinicPhone !== undefined) patch.clinicPhone = body.clinicPhone;
    if (body.clinicEmail !== undefined) patch.clinicEmail = body.clinicEmail;

    if (body.morningStart !== undefined) patch.morningStart = body.morningStart;
    if (body.morningEnd !== undefined) patch.morningEnd = body.morningEnd;
    if (body.eveningStart !== undefined) patch.eveningStart = body.eveningStart;
    if (body.eveningEnd !== undefined) patch.eveningEnd = body.eveningEnd;
    if (body.lunchStart !== undefined) patch.lunchStart = body.lunchStart;
    if (body.lunchEnd !== undefined) patch.lunchEnd = body.lunchEnd;

    if (body.availableDays !== undefined) patch.availableDays = body.availableDays;
    if (body.holidays !== undefined) patch.holidays = body.holidays;

    if (body.consultationFee !== undefined) patch.consultationFee = Number(body.consultationFee);
    if (body.onlineConsultationFee !== undefined) patch.onlineConsultationFee = Number(body.onlineConsultationFee);
    if (body.offlineConsultationFee !== undefined) patch.offlineConsultationFee = Number(body.offlineConsultationFee);
    if (body.emergencyFee !== undefined) patch.emergencyFee = Number(body.emergencyFee);

    if (body.maxPatientsPerHour !== undefined) patch.maxPatientsPerHour = Number(body.maxPatientsPerHour);
    if (body.maxOnlineSlots !== undefined) patch.maxOnlineSlots = Number(body.maxOnlineSlots);
    if (body.maxOfflineSlots !== undefined) patch.maxOfflineSlots = Number(body.maxOfflineSlots);
    if (body.slotDurationMinutes !== undefined) patch.slotDurationMinutes = Number(body.slotDurationMinutes);
    if (body.reminderTimeMinutes !== undefined) patch.reminderTimeMinutes = Number(body.reminderTimeMinutes);
    if (body.emailTemplates !== undefined) patch.emailTemplates = body.emailTemplates;

    if (body.maxBookingsPerDay !== undefined) {
      patch.maxBookingsPerDay = Math.min(200, Math.max(1, Number(body.maxBookingsPerDay)));
    }
    if (body.bookingCutoffHour !== undefined) patch.bookingCutoffHour = Number(body.bookingCutoffHour);
    if (body.bookingCutoffMinute !== undefined) patch.bookingCutoffMinute = Number(body.bookingCutoffMinute);

    // Online booking toggles
    if (body.enableOnlineBooking !== undefined) patch.enableOnlineBooking = !!body.enableOnlineBooking;
    if (body.onlineDays !== undefined) patch.onlineDays = body.onlineDays;
    if (body.onlineStart !== undefined) patch.onlineStart = body.onlineStart;
    if (body.onlineEnd !== undefined) patch.onlineEnd = body.onlineEnd;
    if (body.onlineSlotDuration !== undefined) patch.onlineSlotDuration = Number(body.onlineSlotDuration);
    if (body.onlineBreakStart !== undefined) patch.onlineBreakStart = body.onlineBreakStart;
    if (body.onlineBreakEnd !== undefined) patch.onlineBreakEnd = body.onlineBreakEnd;
    if (body.onlineMaxDailyBooking !== undefined) patch.onlineMaxDailyBooking = Number(body.onlineMaxDailyBooking);
    if (body.bookingBufferHours !== undefined) patch.bookingBufferHours = Number(body.bookingBufferHours);
    if (body.onlineHolidayExceptions !== undefined) patch.onlineHolidayExceptions = body.onlineHolidayExceptions;
    if (body.onlinePaymentMandatory !== undefined) patch.onlinePaymentMandatory = !!body.onlinePaymentMandatory;
    if (body.onlineRequiresApproval !== undefined) patch.onlineRequiresApproval = !!body.onlineRequiresApproval;

    // Slot blocking support
    if (body.blockSlot?.date && body.blockSlot?.time) {
      const current = await getClinicSettings();
      patch.blockedSlots = [
        ...(current.blockedSlots || []),
        { date: body.blockSlot.date, time: body.blockSlot.time },
      ];
    }
    if (body.unblockSlot?.date && body.unblockSlot?.time) {
      const current = await getClinicSettings();
      patch.blockedSlots = (current.blockedSlots || []).filter(
        (s) => !(s.date === body.unblockSlot.date && s.time === body.unblockSlot.time)
      );
    }

    const updated = await updateClinicSettings(patch);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import type { ClinicSettings, SlotAvailability, SlotStatus } from './types';

/** Parse "09:15 AM" → minutes from midnight */
export function timeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Minutes from midnight → "09:15 AM" */
export function minutesToTime(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
}

export function parseHHMM(value: string): number {
  if (!value) return 0;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** All slots for a day depending on type (morning + evening sessions for clinic, or online timings). */
export function generateDaySlots(settings: ClinicSettings, type: 'clinic' | 'online' = 'online'): string[] {
  const slots: string[] = [];

  if (type === 'online') {
    const duration = settings.onlineSlotDuration || settings.slotDurationMinutes || 15;
    const startMin = parseHHMM(settings.onlineStart || settings.morningStart || '10:00');
    const endMin = parseHHMM(settings.onlineEnd || settings.eveningEnd || '18:00');
    const breakStart = parseHHMM(settings.onlineBreakStart || settings.lunchStart || '13:00');
    const breakEnd = parseHHMM(settings.onlineBreakEnd || settings.lunchEnd || '14:00');

    for (let t = startMin; t < endMin; t += duration) {
      // Exclude slots that fall during the break timing
      if (t >= breakStart && t < breakEnd) continue;
      slots.push(minutesToTime(t));
    }
  } else {
    const duration = settings.slotDurationMinutes || 15;
    const ranges = [
      [parseHHMM(settings.morningStart), parseHHMM(settings.morningEnd)],
      [parseHHMM(settings.eveningStart), parseHHMM(settings.eveningEnd)],
    ];
    const breakStart = parseHHMM(settings.lunchStart || '14:00');
    const breakEnd = parseHHMM(settings.lunchEnd || '17:00');

    for (const [start, end] of ranges) {
      for (let t = start; t < end; t += duration) {
        if (t >= breakStart && t < breakEnd) continue;
        slots.push(minutesToTime(t));
      }
    }
  }

  return slots;
}

export function todayISO(): string {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }).split(',')[0].split('/').reduce((acc, curr, idx, arr) => {
    // Return standard YYYY-MM-DD
    if (idx === 0) return acc; // MM
    if (idx === 1) return `${arr[2]}-${arr[0].padStart(2, '0')}-${curr.padStart(2, '0')}`;
    return acc;
  }, '');
}

export function isBookingClosedForDate(date: string, settings: ClinicSettings): boolean {
  const now = new Date();
  const today = new Date().toISOString().split('T')[0];

  if (date < today) return true;

  if (date === today) {
    const cutoff = settings.bookingCutoffHour * 60 + (settings.bookingCutoffMinute || 0);
    const current = now.getHours() * 60 + now.getMinutes();
    if (current >= cutoff) return true;
  }

  return false;
}

export function buildSlotAvailability(
  date: string,
  settings: ClinicSettings,
  bookedTimes: Set<string>,
  blockedTimes: Set<string>,
  totalBookings: number,
  type: 'clinic' | 'online' = 'online'
): { slots: SlotAvailability[]; fullyBooked: boolean; bookingClosed: boolean } {
  // 1. Check if online booking is completely disabled
  if (type === 'online' && !settings.enableOnlineBooking) {
    return { slots: [], fullyBooked: true, bookingClosed: true };
  }

  // 2. Check if date is in the past or cutoff is reached
  const bookingClosed = isBookingClosedForDate(date, settings);
  const maxLimit = type === 'online' ? (settings.onlineMaxDailyBooking || settings.maxBookingsPerDay) : settings.maxBookingsPerDay;
  const fullyBooked = totalBookings >= maxLimit;

  // 3. Check weekday availability
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  const allowedDays = type === 'online' ? (settings.onlineDays || settings.availableDays) : settings.availableDays;
  if (!allowedDays.includes(dayOfWeek)) {
    return { slots: [], fullyBooked: true, bookingClosed: true };
  }

  // 4. Check holidays
  if (settings.holidays?.includes(date)) {
    return { slots: [], fullyBooked: true, bookingClosed: true };
  }
  if (type === 'online' && settings.onlineHolidayExceptions?.includes(date)) {
    return { slots: [], fullyBooked: true, bookingClosed: true };
  }

  // 5. Generate all slots for that day type
  const allSlots = generateDaySlots(settings, type);

  // 6. Check slot-by-slot status and buffer hours
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().split('T')[0];
  const bufferMinutes = (type === 'online' ? (settings.bookingBufferHours || 2) : 0) * 60;

  const slots: SlotAvailability[] = allSlots.map((time) => {
    let status: SlotStatus = 'available';
    
    // Check if slot is blocked by doctor or already booked
    if (blockedTimes.has(time)) {
      status = 'blocked';
    } else if (bookedTimes.has(time)) {
      status = 'booked';
    } else if (fullyBooked || bookingClosed) {
      status = 'blocked';
    } else if (date === todayStr) {
      // Check if slot is within booking buffer time from now
      const slotMinutes = timeToMinutes(time);
      if (slotMinutes - currentMinutes < bufferMinutes) {
        status = 'blocked';
      }
    }

    return { time, status };
  });

  return { slots, fullyBooked, bookingClosed };
}

export function estimateWaitMinutes(waitingCount: number): number {
  return Math.max(5, waitingCount * 15);
}

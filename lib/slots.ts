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

  // Use the exact same morning and evening shift ranges for both online & offline consultations
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

/** Formats "HH:MM" 24h string into "hh:mm AM/PM" 12h string */
export function formatHHMM(value: string): string {
  if (!value) return '';
  return minutesToTime(parseHHMM(value));
}

/** Extracts the main colony or area name from a full address string */
export function getAreaFromAddress(address: string): string {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  
  // 1. First, search for parts containing specific colony/area keywords
  const colonyKeywords = ['nagar', 'colony', 'ganj', 'lines', 'sector', 'chowk', 'bazar', 'market', 'scheme', 'extension', 'phase', 'marg', 'path', 'street', 'enclave', 'road', 'ward'];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (colonyKeywords.some(kw => lower.includes(kw))) {
      return part;
    }
  }

  // 2. If no colony keywords found, try to filter out building names, numbers, landmarks, and city names
  const ignoreKeywords = ['shop', 'flat', 'house', 'building', 'plot', 'centre', 'center', 'clinic', 'hospital', 'hub', 'suite', 'floor', 'opposite', 'near', 'behind', 'ujjain', 'delhi', 'indore', 'bhopal', 'mumbai', 'pune', 'bangalore'];
  for (const part of parts) {
    const lower = part.toLowerCase();
    const isBuildingOrLandmark = ignoreKeywords.some(kw => lower.includes(kw));
    const isShortOrCode = /^[a-zA-Z0-9-]{1,6}$/.test(part); // e.g. "B-23", "102", "Block-A"
    const hasOnlyNumbers = /^\d+$/.test(part.replace(/[^0-9]/g, ''));
    
    if (!isBuildingOrLandmark && !isShortOrCode && !hasOnlyNumbers) {
      return part;
    }
  }

  // 3. Absolute fallbacks
  if (parts.length > 1) {
    const firstPart = parts[0];
    const isCode = /^[a-zA-Z0-9-]{1,6}$/.test(firstPart) || /^\d/.test(firstPart);
    if (isCode) {
      return parts[1];
    }
    return firstPart;
  }

  return parts[0] || '';
}

/** Formats a price string to ensure it has a Rupees icon (₹) if needed */
export function formatPrice(price: string): string {
  if (!price) return 'Consultation required';
  const clean = price.trim();
  if (clean.includes('₹') || /rs/i.test(clean)) {
    return clean;
  }
  // Check if it starts with "From" followed by a number
  if (/^from\s+\d+/i.test(clean)) {
    return clean.replace(/^from\s+/i, 'From ₹');
  }
  // If it starts with a number or contains a number, and has no currency symbol
  if (/^\b\d+/.test(clean)) {
    return `₹${clean}`;
  }
  return clean;
}


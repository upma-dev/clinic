/**
 * WhatsApp Notification Utility
 * Generates wa.me deep-links so admin can send pre-filled WhatsApp messages to patients.
 * No API key required — uses free WhatsApp Web / App protocol.
 */

/**
 * Sanitize phone number to international format (digits only).
 * Adds country code 91 (India) if not already present.
 */
export function sanitizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  // If starts with 91 and length is 12 → already has country code
  if (digits.startsWith('91') && digits.length === 12) return digits;
  // If 10-digit Indian mobile number → prefix 91
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Build a wa.me URL with a pre-filled text message.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const sanitized = sanitizePhone(phone);
  return `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp confirmation message when admin approves a booking.
 */
export function buildConfirmationMessage(params: {
  clinicName: string;
  patientName: string;
  appointmentId: string;
  date: string;
  time: string;
  service: string;
  tokenNumber?: number;
  clinicPhone?: string;
  clinicAddress?: string;
}): string {
  const {
    clinicName,
    patientName,
    appointmentId,
    date,
    time,
    service,
    tokenNumber,
    clinicAddress,
  } = params;

  return `*${clinicName} — Appointment Confirmed ✅*

Namaste ${patientName}! Aapka appointment confirm ho gaya hai.

*📋 Booking Details:*
• Reference: ${appointmentId}
• Service: ${service}
• Date: ${date}
• Time: ${time}${tokenNumber ? `\n• Queue Token: #${tokenNumber}` : ''}${clinicAddress ? `\n\n📍 *Address:* ${clinicAddress}` : ''}

⏰ Please apne slot se 10 minutes pehle pahunche.

Koi sawaal ho toh clinic se sampark karein. Dhanyawad! 🙏`;
}

/**
 * Build WhatsApp reschedule message when admin changes the appointment slot.
 */
export function buildRescheduleMessage(params: {
  clinicName: string;
  patientName: string;
  appointmentId: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  reason?: string;
  clinicAddress?: string;
}): string {
  const {
    clinicName,
    patientName,
    appointmentId,
    newDate,
    newTime,
    reason,
    clinicAddress,
  } = params;

  return `*${clinicName} — Appointment Rescheduled 🔄*

Namaste ${patientName}! Aapka appointment reschedule kiya gaya hai.

*📋 Updated Booking Details:*
• Reference: ${appointmentId}
• New Date: ${newDate}
• New Time: ${newTime}${reason ? `\n• Reason: ${reason}` : ''}${clinicAddress ? `\n\n📍 *Address:* ${clinicAddress}` : ''}

⏰ Please naye slot se 10 minutes pehle pahunche.

Inconvenience ke liye khed hai. Koi sawaal ho toh clinic se sampark karein. Dhanyawad! 🙏`;
}

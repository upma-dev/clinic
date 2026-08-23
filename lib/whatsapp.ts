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

  return `*🌟 ${clinicName} — Appointment Confirmed ✅*

Namaste *${patientName}*! 🙏

Aapka appointment safaltapoorvak confirm ho gaya hai. Hum aapko behtareen skin care experience dene ke liye tayyar hain.

*📋 Booking Details:*
• *Booking ID:* #${appointmentId}
• *Service:* ${service}
• *Date:* ${date}
• *Time:* ${time}${tokenNumber ? `\n• *Queue Token:* #${tokenNumber}` : ''}${clinicAddress ? `\n\n📍 *Clinic Address:* ${clinicAddress}` : ''}

*🔔 Important Instructions:*
1. Apne scheduled slot se 10 minutes pehle clinic zaroor pahunche.
2. Agar koi purani medical reports ya ongoing prescriptions hain, toh unhe saath layein.

Aapki skin health hamari priority hai! 💖
Koi query hone par clinic se sampark karein.

Dhanyawad!
*Team Skin Hub* 🙏`;
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

  return `*🔄 ${clinicName} — Appointment Rescheduled*

Namaste *${patientName}*! 🙏

Aapka appointment reschedule kiya gaya hai. Naye appointment ki details niche di gayi hain:

*📋 Updated Booking Details:*
• *Booking ID:* #${appointmentId}
• *New Date:* ${newDate}
• *New Time:* ${newTime}${reason ? `\n• *Reason:* ${reason}` : ''}${clinicAddress ? `\n\n📍 *Clinic Address:* ${clinicAddress}` : ''}

⏰ Kripya naye time slot se 10 minutes pehle clinic pahunche.

Inconvenience ke liye humein khed hai. Koi query hone par clinic se sampark karein.

Aapki skin health hamari priority hai! 💖
Dhanyawad! 🙏`;
}

/**
 * Build WhatsApp thank you message when doctor completes treatment.
 */
export function buildThankYouMessage(params: {
  clinicName: string;
  patientName: string;
  appointmentId: string;
  service: string;
  doctorName: string;
  nextScheduleDate?: string;
}): string {
  const {
    clinicName,
    patientName,
    appointmentId,
    service,
    doctorName,
    nextScheduleDate,
  } = params;

  return `*💖 ${clinicName} — Thank You for Visiting! 🙏*

Namaste *${patientName}*! 🌸

Hum aasha karte hain ki aaj clinic mein aapka consultation/treatment experience achha raha hoga.

*📋 Session Summary:*
• *Booking ID:* #${appointmentId}
• *Service:* ${service}
• *Doctor:* ${doctorName}
${nextScheduleDate ? `• *Next Follow-up:* ${nextScheduleDate} 🗓️\n` : ''}
*🌸 Post-Care Tips:*
1. Doctor dwara batayi gayi prescription aur skincare checklist ko follow karein.
2. Apni skin ko hamesha clean aur hydrated rakhein.
3. Dhoop mein nikalne se pehle sunscreen zaroor apply karein.

*⭐ Share Your Feedback:*
Aapka feedback humare liye bohot valuable hai. Agar aapko humari services pasand aayi hain, toh please apna review zaroor share karein:
🔗 https://g.page/r/skinhubujjain/review

Aapki skin hamesha swasth aur glow karti rahe! ✨

Warm regards,
*${doctorName} & Team*
*${clinicName}* 🙏`;
}

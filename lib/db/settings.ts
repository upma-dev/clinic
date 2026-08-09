import { getDb, COLLECTIONS } from '../mongodb';
import type { ClinicSettings } from '../types';

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: "Dr. Prateek Tiwari's Skin Hub Derma, Hair & Laser Clinic",
  clinicLogo: '/assets/logo.png',
  clinicAddress: 'Skin Hub & Physio Centre, Rishi Nagar, Ujjain, Madhya Pradesh 456010',
  clinicPhone: '+91 98270 42111',
  clinicEmail: 'contact@skinhubujjain.com',
  morningStart: '09:00',
  morningEnd: '14:00',
  eveningStart: '17:00',
  eveningEnd: '21:00',
  lunchStart: '14:00',
  lunchEnd: '17:00',
  availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  holidays: [],
  consultationFee: 200,
  onlineConsultationFee: 500,
  offlineConsultationFee: 200,
  emergencyFee: 1000,
  maxPatientsPerHour: 4,
  maxOnlineSlots: 10,
  maxOfflineSlots: 22,
  slotDurationMinutes: 15,
  reminderTimeMinutes: 60,
  emailTemplates: {
    booked: 'Dear {name}, your appointment booking request for {date} at {time} has been registered. Reference: {id}.',
    confirmed: 'Dear {name}, your appointment at Skin Hub on {date} at {time} is confirmed. Your queue token number is #{token}. Please arrive 10 minutes prior.',
    paymentSuccess: 'Dear {name}, we have successfully received your prepayment of Rs. {amount} for appointment on {date}. Status: Paid.',
    paymentFailed: 'Dear {name}, payment of Rs. {amount} failed or was cancelled. Your booking stays pending payment.',
    cancelled: 'Dear {name}, your appointment at Skin Hub on {date} at {time} has been cancelled.',
    rescheduled: 'Dear {name}, your appointment has been rescheduled to {newDate} at {newTime}. Reason: {reason}. Click here to confirm: {confirmUrl}',
    doctorDelayed: 'Dear {name}, we regret to inform you that Dr. Prateek Tiwari is running delayed by {delayMinutes} minutes today.',
    reminderBefore: 'Dear {name}, this is a reminder for your upcoming appointment today at {time}. Please arrive on time.',
    followUp: 'Dear {name}, this is a reminder that Dr. Prateek Tiwari has scheduled your follow-up consultation on {date}. Clinic address: {address}.',
    prescriptionReady: 'Dear {name}, your prescription is ready. You can download it using the patient portal. Doctor notes: {notes}.',
  },
  maxBookingsPerDay: 32,
  bookingCutoffHour: 19,
  bookingCutoffMinute: 30,
  blockedSlots: [],
  
  // Online booking specific
  enableOnlineBooking: true,
  onlineDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  onlineStart: '10:00',
  onlineEnd: '18:00',
  onlineSlotDuration: 20,
  onlineBreakStart: '13:00',
  onlineBreakEnd: '14:00',
  onlineMaxDailyBooking: 15,
  bookingBufferHours: 2,
  onlineHolidayExceptions: [],
  onlinePaymentMandatory: false,
  onlineRequiresApproval: false,
};

export async function getClinicSettings(): Promise<ClinicSettings> {
  try {
    const db = await getDb();
    const doc = await db.collection<ClinicSettings>(COLLECTIONS.settings).findOne({});
    if (!doc) {
      const { _id: _unused, ...defaults } = DEFAULT_SETTINGS;
      await db.collection(COLLECTIONS.settings).insertOne(defaults);
      return DEFAULT_SETTINGS;
    }
    const { _id, ...rest } = doc;
    return { ...DEFAULT_SETTINGS, ...rest };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateClinicSettings(
  patch: Partial<ClinicSettings>
): Promise<ClinicSettings> {
  const db = await getDb();
  await db.collection(COLLECTIONS.settings).updateOne(
    {},
    { $set: patch },
    { upsert: true }
  );
  return getClinicSettings();
}

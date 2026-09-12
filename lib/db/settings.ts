import { getDb, COLLECTIONS } from '../mongodb';
import type { ClinicSettings } from '../types';
import { cache } from '../cache';

const SETTINGS_CACHE_KEY = 'public:clinic_settings';
const CACHE_TTL_SECONDS = 600; // 10 minutes

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: "Dr. Prateek Tiwari's Skin Hub Derma, Hair & Laser Clinic",
  clinicLogo: '/assets/logo.png',
  clinicAddress: 'B-23, Bada Shopping Complex, Opposite Water Tank, Rishi Nagar, Ujjain, Madhya Pradesh 456010',
  clinicPhone: '+91 98270 42111',
  clinicEmail: 'contact@skinhubujjain.com',
  morningStart: '11:00',
  morningEnd: '15:00',
  eveningStart: '17:00',
  eveningEnd: '21:00',
  availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  holidays: [],
  consultationFee: 200,
  onlineConsultationFee: 500,
  offlineConsultationFee: 200,
  onlinePreBookingFee: 500,
  offlinePreBookingFee: 50,
  emergencyFee: 1000,
  slotDurationMinutes: 3,
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
  bookingCutoffHour: 19,
  bookingCutoffMinute: 30,
  advanceBookingDays: 7,
  blockedSlots: [],
  
  // Online & Offline booking specific controls
  onlineDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  onlineStart: '10:00',
  onlineEnd: '18:00',
  onlineSlotDuration: 20,
  bookingBufferHours: 2,
  onlineHolidayExceptions: [],
  onlinePaymentMandatory: false,
  offlinePaymentMandatory: false,
  onlinePaymentTiming: 'pre_booking',
  offlinePaymentTiming: 'after_booking',
  onlineRequiresApproval: false,
  autoReserveHourlyBufferSlots: true,
  hourlyBufferCount: 3,
};

export async function getClinicSettings(): Promise<ClinicSettings> {
  return cache.getOrSet(
    SETTINGS_CACHE_KEY,
    async () => {
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
    },
    CACHE_TTL_SECONDS
  );
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
  // Invalidate cache immediately on update
  cache.delete(SETTINGS_CACHE_KEY);
  return getClinicSettings();
}

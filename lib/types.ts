/** Shared types — safe to import from client components (no secrets). */

export type AdminRole = 'staff' | 'doctor';

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'
  | 'Checked In'
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'arrived'
  | 'no-show'
  | 'completed'
  | 'booked'
  | 'checked-in';

export type BookingSource = 'online' | 'walk-in';

export type PaymentStatus =
  | 'Pending'
  | 'Paid'
  | 'Failed'
  | 'Refunded'
  | 'Partial Refund'
  | 'unpaid'
  | 'paid'
  | 'pending'
  | 'failed'
  | 'refunded';

export type SlotStatus = 'available' | 'booked' | 'blocked';

export type QueueCongestion = 'green' | 'yellow' | 'red';

export type QueueEntryStatus = 'waiting' | 'serving' | 'consulting' | 'done' | 'skipped';

export interface Booking {
  _id?: string;
  id: string;
  name: string;
  phone: string;
  email?: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:15 AM"
  message?: string;
  payOnline: boolean;
  bookingType?: 'online' | 'offline' | string;
  status: BookingStatus;
  source: BookingSource;
  tokenNumber?: number;
  createdAt: string;

  // Patient Intake Details (Online Flow)
  gender?: string;
  age?: number;
  address?: string;
  skinType?: string;
  problemDescription?: string;
  previousMedication?: string;
  images?: string[];
  appointmentNotes?: string;

  // Follow-up details (Offline Flow)
  nextScheduleDate?: string;

  // Payment Tracking
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amountPaid?: number;
  paidAt?: string;
  refundId?: string;
  refundedAt?: string;
}

export interface DailyQueue {
  date: string;
  currentToken: number;
  totalPatientsToday: number;
  estimatedWaitMinutes: number;
  congestion: QueueCongestion;
  message: string;
  nextPatientName?: string;
  status?: 'active' | 'paused' | 'away' | string;
  lastUpdated: string;
}

export interface QueueEntry {
  _id?: string;
  date: string;
  tokenNumber?: number;
  name: string;
  phone: string;
  source: BookingSource;
  bookingId?: string;
  status: QueueEntryStatus;
  priority?: number;
  estimatedWaitMinutes: number;
  scheduledTime?: string; // e.g. "09:15 AM" — for late detection
  createdAt: string;
}

export interface ClinicSettings {
  _id?: string;
  doctorName?: string;
  // Dynamic Clinic Settings
  clinicName: string;
  clinicLogo?: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  morningStart: string; // "09:00"
  morningEnd: string; // "14:00"
  eveningStart: string; // "17:00"
  eveningEnd: string; // "21:00"
  lunchStart: string; // "14:00"
  lunchEnd: string; // "17:00"
  availableDays: string[]; // e.g. ["Monday", "Tuesday", ...]
  holidays: string[]; // e.g. ["2026-12-25"]
  consultationFee: number;
  onlineConsultationFee: number;
  offlineConsultationFee: number;
  emergencyFee: number;
  maxPatientsPerHour: number;
  maxOnlineSlots: number;
  maxOfflineSlots: number;
  slotDurationMinutes: number; // e.g. 15
  reminderTimeMinutes: number; // e.g. 60
  emailTemplates: {
    booked: string;
    confirmed: string;
    paymentSuccess: string;
    paymentFailed: string;
    cancelled: string;
    rescheduled: string;
    doctorDelayed: string;
    reminderBefore: string;
    followUp: string;
    prescriptionReady: string;
  };
  maxBookingsPerDay: number;
  bookingCutoffHour: number; // 24h, default 19
  bookingCutoffMinute: number; // default 30 → 7:30 PM
  blockedSlots: { date: string; time: string }[];

  // Online Booking Specific Controls
  enableOnlineBooking: boolean;
  onlineDays: string[]; // e.g. ["Monday", "Tuesday"]
  onlineStart: string; // "10:00"
  onlineEnd: string; // "16:00"
  onlineSlotDuration: number; // e.g. 20
  onlineBreakStart: string; // "13:00"
  onlineBreakEnd: string; // "14:00"
  onlineMaxDailyBooking: number; // e.g. 15
  bookingBufferHours: number; // e.g. 2
  onlineHolidayExceptions: string[];
  onlinePaymentMandatory: boolean;
  onlineRequiresApproval: boolean;
}

export interface BlogPost {
  _id?: string;
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  readTime: string;
  imageUrl?: string;
  tags?: string[];
  status?: 'draft' | 'published';
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  views?: number;
  createdAt: string;
}

export interface CMSContent {
  _id?: string;
  bannerText: string;
  bannerLink: string;
  bannerEnabled: boolean;
  
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroDescription: string;
  heroBadge1: string;
  heroBadge2: string;
  heroExperienceBadge: string;
  heroImageUrl: string;
  heroExperienceText: string;
  
  aboutTitle: string;
  aboutSubtitle: string;
  aboutDescription: string;
  aboutStats: { value: string; label: string }[];
  aboutCredentials: string[];
  aboutDoctorImage: string;

  services: { id: string; name: string; description: string; price: string; imageUrl?: string }[];
  faqs: { question: string; answer: string }[];
  testimonials: { name: string; text: string; rating: number; role: string; imageUrl?: string }[];
  gallery: { id: string; title: string; imageUrl: string; category: string }[];

  contactAddress: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  contactTimings: string;
  googleMapsEmbed: string;

  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  twitterUrl: string;
  
  footerText: string;
  copyrightText: string;
  clinicPhotos: string[];
}

export interface DbNotification {
  _id?: string;
  id: string;
  type: 'booking_new' | 'booking_cancelled' | 'payment_received' | 'reminder_sent' | 'reschedule_request' | 'queue_update' | 'patient_arrived';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface SlotAvailability {
  time: string;
  status: SlotStatus;
  bookingId?: string;
}

/** @deprecated Use DailyQueue — kept for gradual UI migration */
export interface QueueState {
  currentPatient: number;
  totalPatientsToday: number;
  estimatedWaitTime: number;
  status: QueueCongestion;
  message: string;
  lastUpdated: string;
}

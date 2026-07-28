import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from '../mongodb';

export interface TelemedicineAppointment {
  _id?: string;
  patientId?: string; // If registered, otherwise null until matched
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  city: string;
  state: string;
  preferredDate: string;
  preferredTimeSlot: string;
  chiefComplaint: string;
  symptomsDuration: string;
  previousMedicalHistory: string;
  currentMedicines?: string;
  knownAllergies?: string;
  preferredLanguage: string;
  
  // File URLs (Cloudinary)
  reportUrls?: string[];
  skinImageUrls?: string[];

  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  
  // Payment Details
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  amountPaid?: number;
  
  // Meeting details (populated on confirm)
  meetingProvider?: string;
  meetingId?: string;
  meetingUrl?: string;
  meetingPassword?: string;
  meetingStartTime?: string;
  meetingEndTime?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface TelemedicineQuestionnaire {
  _id?: string;
  appointmentId: string;
  patientId: string;
  
  currentSymptoms: string;
  durationOfSymptoms: string;
  severityLevel: 'Mild' | 'Moderate' | 'Severe';
  previousTreatments: string;
  currentMedicines: string;
  knownAllergies: string;
  medicalConditions: string;
  
  // File URLs
  additionalSkinPhotos?: string[];
  additionalReports?: string[];
  
  additionalNotes?: string;
  consentGiven: boolean;
  
  status: 'draft' | 'completed';
  completedAt?: string;
}

export interface TelemedicineConsultation {
  _id?: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  
  diagnosis: string;
  prescription: string; // Plain text or JSON structure
  medicines: any[]; // Structured medicines array
  
  // Routine to be converted to actual routine entries
  morningRoutine: string[];
  nightRoutine: string[];
  
  lifestyleAdvice: string;
  dietSuggestions: string;
  recommendedProducts: string;
  labTests: string;
  
  doctorInternalNotes: string; // Hidden from patient
  patientInstructions: string;
  
  followUpDate?: string;
  
  consultationDurationMinutes: number;
  consultationDate: string;
  
  generatedPdfUrl?: string; // Cloudinary URL
  
  createdAt: string;
}

export interface MedicalReport {
  _id?: string;
  patientId: string;
  appointmentId?: string;
  reportName: string;
  fileUrl: string;
  uploadDate: string;
}

export interface ProgressPhoto {
  _id?: string;
  patientId: string;
  appointmentId?: string;
  consultationId?: string;
  imageUrl: string;
  uploadDate: string;
}

// Database Helpers

export async function createTelemedicineAppointment(data: Omit<TelemedicineAppointment, '_id' | 'createdAt' | 'updatedAt' | 'status'>) {
  const db = await getDb();
  const appointment: TelemedicineAppointment = {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const { _id: _unused, ...doc } = appointment;
  const result = await db.collection(COLLECTIONS.telemedicine_appointments).insertOne(doc);
  return { ...appointment, _id: result.insertedId.toString() };
}

export async function getTelemedicineAppointmentsByStatus(status: string) {
  const db = await getDb();
  const appointments = await db.collection(COLLECTIONS.telemedicine_appointments)
    .find({ status })
    .sort({ createdAt: -1 })
    .toArray();
  return appointments.map(a => ({ ...a, _id: a._id.toString() }));
}

export async function getTelemedicineAppointmentsByPatient(patientId: string) {
  const db = await getDb();
  const appointments = await db.collection(COLLECTIONS.telemedicine_appointments)
    .find({ patientId })
    .sort({ createdAt: -1 })
    .toArray();
  return appointments.map(a => ({ ...a, _id: a._id.toString() }));
}

export async function updateTelemedicineAppointmentStatus(id: string, updates: Partial<TelemedicineAppointment>) {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.telemedicine_appointments).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...updates, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  return result;
}

// Additional helper functions for questionnaires, consultations, etc. will be added as needed.

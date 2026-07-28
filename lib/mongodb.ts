import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'skinhub';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (!uri) {
  // Dev fallback — APIs will return clear errors until .env is configured
  clientPromise = Promise.reject(new Error('MONGODB_URI is not set in environment variables'));
} else if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export const COLLECTIONS = {
  bookings: 'bookings',
  queue: 'queue_entries',
  dailyQueue: 'daily_queue',
  settings: 'clinic_settings',
  blogs: 'blogs',
  walkin_requests: 'walkin_requests',
  patients: 'patients',
  routines: 'routines',
  routine_logs: 'routine_logs',
  telemedicine_appointments: 'telemedicine_appointments',
  telemedicine_questionnaires: 'telemedicine_questionnaires',
  telemedicine_consultations: 'telemedicine_consultations',
  medical_reports: 'medical_reports',
  progress_photos: 'progress_photos',
  cms: 'cms',
  notifications: 'notifications',
} as const;

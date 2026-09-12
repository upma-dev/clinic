import { MongoClient, Db } from 'mongodb';
import dns from 'dns';

// Fix Node.js IPv6 first lookup issues & DNS SRV resolution on Windows / local Wi-Fi networks
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore fallback if unsupported in environment
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'skinhub';

const options = {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI is not set in environment variables'));
  }
  const client = new MongoClient(uri, options);
  const promise = client.connect();
  promise.catch(() => {
    // Reset cached promise on failure so next request can retry connection
    if (global._mongoClientPromise === promise) {
      global._mongoClientPromise = undefined;
    }
  });
  return promise;
}

export async function getDb(): Promise<Db> {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    try {
      const client = await global._mongoClientPromise;
      return client.db(dbName);
    } catch (err) {
      global._mongoClientPromise = undefined;
      throw err;
    }
  } else {
    const client = await createClientPromise();
    return client.db(dbName);
  }
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
  support_tickets: 'support_tickets',
} as const;


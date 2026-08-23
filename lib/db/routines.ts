import { getDb, COLLECTIONS } from '../mongodb';
import { ObjectId } from 'mongodb';

export type RoutineCategory = 'Medicine' | 'Skincare' | 'Water' | 'Exercise' | 'Custom';
export type RoutineRepeat = 'Daily' | 'Weekdays' | 'Weekends' | 'Custom';

export interface Routine {
  _id?: string | ObjectId;
  id: string;
  patientId: string;
  name: string;
  category: RoutineCategory;
  time: string; // UTC Time 'HH:mm'
  repeat: RoutineRepeat;
  notes?: string;
  reminderEnabled: boolean;
  createdAt: string;
}

export interface RoutineLog {
  _id?: string | ObjectId;
  id: string;
  patientId: string;
  routineId: string;
  date: string; // YYYY-MM-DD local
  completedAt: string; // ISO string
}

export async function createRoutine(data: Routine): Promise<Routine> {
  const db = await getDb();
  const { _id, ...doc } = data;
  await db.collection(COLLECTIONS.routines).insertOne(doc);
  return data;
}

export async function getPatientRoutines(patientId: string): Promise<Routine[]> {
  const db = await getDb();
  const docs = await db.collection<Routine>(COLLECTIONS.routines)
    .find({ patientId })
    .sort({ time: 1 })
    .toArray();
  return docs.map(({ _id, ...r }) => ({ ...r, _id: _id?.toString() }));
}

export async function deleteRoutine(id: string, patientId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.routines).deleteOne({ id, patientId });
  return result.deletedCount > 0;
}

// Log Methods
export async function toggleRoutineLog(patientId: string, routineId: string, date: string): Promise<boolean> {
  const db = await getDb();
  const collection = db.collection<RoutineLog>(COLLECTIONS.routine_logs);
  
  const existing = await collection.findOne({ patientId, routineId, date });
  
  if (existing) {
    // Uncheck
    await collection.deleteOne({ _id: existing._id });
    return false; // Currently not completed
  } else {
    // Check
    await collection.insertOne({
      id: new ObjectId().toString(),
      patientId,
      routineId,
      date,
      completedAt: new Date().toISOString()
    } as any);
    return true; // Currently completed
  }
}

export async function getPatientRoutineLogsForDate(patientId: string, date: string): Promise<RoutineLog[]> {
  const db = await getDb();
  const docs = await db.collection<RoutineLog>(COLLECTIONS.routine_logs)
    .find({ patientId, date })
    .toArray();
  return docs.map(({ _id, ...l }) => ({ ...l, _id: _id?.toString() }));
}

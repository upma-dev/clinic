import { getDb, COLLECTIONS } from '../mongodb';
import { ObjectId } from 'mongodb';

export interface Patient {
  _id?: string | ObjectId;
  id: string;
  phone: string;
  name?: string;
  createdAt: string;
}

export async function getOrCreatePatient(phone: string, name?: string): Promise<Patient> {
  const db = await getDb();
  const collection = db.collection<Patient>(COLLECTIONS.patients);
  
  let patient = await collection.findOne({ phone });
  
  if (!patient) {
    const newPatient = {
      id: new ObjectId().toString(),
      phone,
      name,
      createdAt: new Date().toISOString()
    };
    await collection.insertOne(newPatient as any);
    return newPatient;
  }
  
  const { _id, ...rest } = patient;
  return { ...rest, _id: _id?.toString() } as Patient;
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const db = await getDb();
  const patient = await db.collection<Patient>(COLLECTIONS.patients).findOne({ id });
  if (!patient) return null;
  const { _id, ...rest } = patient;
  return { ...rest, _id: _id?.toString() } as Patient;
}

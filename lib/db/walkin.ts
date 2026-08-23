import { getDb, COLLECTIONS } from '../mongodb';
import { ObjectId } from 'mongodb';

export type VisitType = 'New Consultation' | 'Follow-up' | 'Emergency';
export type WalkInStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface WalkInRequest {
  _id?: string | ObjectId;
  id: string;
  fullName: string;
  mobile: string;
  age: number;
  gender: string;
  visitType: VisitType;
  problem: string;
  previousVisitDate?: string;
  emergencyReason?: string;
  symptomsDuration?: string;
  medicalReports?: string;
  status: WalkInStatus | 'Completed';
  createdAt: string;
}

export async function createWalkInRequest(data: WalkInRequest): Promise<WalkInRequest> {
  const db = await getDb();
  const { _id, ...doc } = data;
  await db.collection(COLLECTIONS.walkin_requests).insertOne(doc);
  return data;
}

export async function getWalkInRequests(query = {}, page = 1, limit = 50): Promise<{ data: WalkInRequest[], total: number }> {
  const db = await getDb();
  const collection = db.collection<WalkInRequest>(COLLECTIONS.walkin_requests);
  
  const total = await collection.countDocuments(query);
  const docs = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
    
  return { 
    data: docs.map(({ _id, ...b }) => ({ ...b, _id: _id?.toString() })),
    total
  };
}

export async function getWalkInRequestById(id: string): Promise<WalkInRequest | null> {
  const db = await getDb();
  const doc = await db.collection<WalkInRequest>(COLLECTIONS.walkin_requests).findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, _id: _id?.toString() };
}

export async function updateWalkInStatus(id: string, status: WalkInStatus | 'Completed'): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection(COLLECTIONS.walkin_requests)
    .updateOne({ id }, { $set: { status } });
  return result.modifiedCount > 0;
}

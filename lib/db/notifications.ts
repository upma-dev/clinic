import { getDb, COLLECTIONS } from '../mongodb';
import type { DbNotification } from '../types';

export async function getNotifications(limit = 50): Promise<DbNotification[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection<DbNotification>(COLLECTIONS.notifications)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(({ _id, ...n }) => ({ ...n, _id: _id?.toString() }));
  } catch (e) {
    console.error('Error fetching notifications:', e);
    return [];
  }
}

export async function createNotification(
  type: DbNotification['type'],
  title: string,
  message: string
): Promise<DbNotification> {
  try {
    const db = await getDb();
    const notification: DbNotification = {
      id: `notif-${Math.floor(100000 + Math.random() * 900000)}`,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const { _id: _unused, ...doc } = notification;
    await db.collection(COLLECTIONS.notifications).insertOne(doc);
    return notification;
  } catch (e) {
    console.error('Error creating notification:', e);
    throw e;
  }
}

export async function markAsRead(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection(COLLECTIONS.notifications)
    .updateOne({ id }, { $set: { read: true } });
  return result.modifiedCount > 0;
}

export async function markAllAsRead(): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection(COLLECTIONS.notifications)
    .updateMany({ read: false }, { $set: { read: true } });
  return result.modifiedCount > 0;
}

export async function clearAllNotifications(): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.notifications).deleteMany({});
  return result.deletedCount > 0;
}

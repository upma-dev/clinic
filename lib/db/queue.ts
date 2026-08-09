import { getDb, COLLECTIONS } from '../mongodb';
import type { DailyQueue, QueueEntry, QueueEntryStatus } from '../types';
import { estimateWaitMinutes, todayISO } from '../slots';

const DEFAULT_QUEUE: DailyQueue = {
  date: todayISO(),
  currentToken: 0,
  totalPatientsToday: 0,
  estimatedWaitMinutes: 0,
  congestion: 'green',
  message: 'Walk-ins welcome. Queue updates in real time.',
  lastUpdated: new Date().toISOString(),
  status: 'active', // 'active' | 'paused' | 'away'
};

export async function getDailyQueue(date: string): Promise<DailyQueue> {
  try {
    const db = await getDb();
    const doc = await db.collection<DailyQueue>(COLLECTIONS.dailyQueue).findOne({ date });
    if (!doc) {
      const fresh = { ...DEFAULT_QUEUE, date };
      await db.collection(COLLECTIONS.dailyQueue).insertOne(fresh);
      return fresh;
    }
    const { _id, ...rest } = doc;
    return rest;
  } catch {
    return { ...DEFAULT_QUEUE, date };
  }
}

export async function updateDailyQueue(
  date: string,
  patch: Partial<DailyQueue>
): Promise<DailyQueue> {
  const db = await getDb();
  const updated = {
    ...patch,
    lastUpdated: new Date().toISOString(),
  };
  await db.collection(COLLECTIONS.dailyQueue).updateOne(
    { date },
    { $set: updated },
    { upsert: true }
  );
  return getDailyQueue(date);
}

export async function getQueueEntries(date: string): Promise<QueueEntry[]> {
  try {
    const db = await getDb();
    const docs = await db
      .collection<QueueEntry>(COLLECTIONS.queue)
      .find({ date })
      .sort({ priority: 1, createdAt: 1 }) // Respect priority first, then createdAt
      .toArray();
    return docs.map(({ _id, ...e }) => ({ ...e, _id: _id?.toString() }));
  } catch (error) {
    console.error('Failed to get queue entries:', error);
    return [];
  }
}

export async function getNextTokenNumber(date: string): Promise<number> {
  return 0; // Legacy support, no longer used
}

export async function addQueueEntry(entry: QueueEntry): Promise<QueueEntry> {
  const db = await getDb();
  const { _id, ...doc } = entry;

  // Prevent duplicate queue entry for the same booking ID
  if (doc.bookingId) {
    const existing = await db.collection(COLLECTIONS.queue).findOne({ bookingId: doc.bookingId });
    if (existing) {
      return entry;
    }
  }

  // Set default priority to 0 if not present
  if (doc.priority === undefined) {
    doc.priority = 0;
  }

  // Remove tokenNumber from doc if present
  delete (doc as any).tokenNumber;

  await db.collection(COLLECTIONS.queue).insertOne(doc);

  const waiting = await db.collection(COLLECTIONS.queue).countDocuments({
    date: entry.date,
    status: 'waiting',
  });

  await updateDailyQueue(entry.date, {
    totalPatientsToday: await db.collection(COLLECTIONS.queue).countDocuments({ date: entry.date }),
    estimatedWaitMinutes: estimateWaitMinutes(waiting),
  });

  return entry;
}

export async function advanceQueue(date: string): Promise<{
  served: QueueEntry | null;
  next: QueueEntry | null;
  queue: DailyQueue;
}> {
  const db = await getDb();

  const currentServing = await db
    .collection<QueueEntry>(COLLECTIONS.queue)
    .findOne({ date, status: { $in: ['serving', 'consulting'] } });

  if (currentServing) {
    await db
      .collection(COLLECTIONS.queue)
      .updateOne(
        { date, bookingId: currentServing.bookingId },
        { $set: { status: 'done' as QueueEntryStatus } }
      );
    if (currentServing.bookingId) {
      await db.collection(COLLECTIONS.bookings).updateOne(
        { id: currentServing.bookingId },
        { $set: { status: 'completed' } }
      );
    }
  }

  // Find next waiting patient, sorting by priority then createdAt
  const next = await db
    .collection<QueueEntry>(COLLECTIONS.queue)
    .findOne({ date, status: 'waiting' }, { sort: { priority: 1, createdAt: 1 } });

  if (next) {
    await db
      .collection(COLLECTIONS.queue)
      .updateOne(
        { date, bookingId: next.bookingId },
        { $set: { status: 'serving' as QueueEntryStatus } }
      );
    if (next.bookingId) {
      await db.collection(COLLECTIONS.bookings).updateOne(
        { id: next.bookingId },
        { $set: { status: 'arrived' } }
      );
    }
  }

  const waiting = await db.collection(COLLECTIONS.queue).countDocuments({
    date,
    status: 'waiting',
  });

  const queue = await updateDailyQueue(date, {
    currentToken: 0,
    nextPatientName: next?.name,
    estimatedWaitMinutes: estimateWaitMinutes(waiting),
    congestion: waiting > 8 ? 'red' : waiting > 4 ? 'yellow' : 'green',
  });

  return {
    served: currentServing as QueueEntry | null,
    next: next as QueueEntry | null,
    queue,
  };
}

// Update Queue Entry status (skip, consulting, send back, complete)
export async function updateQueueEntryStatus(
  date: string,
  bookingId: string,
  status: QueueEntryStatus
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.queue).updateOne(
    { date, bookingId },
    { $set: { status } }
  );

  const waiting = await db.collection(COLLECTIONS.queue).countDocuments({
    date,
    status: 'waiting',
  });

  await updateDailyQueue(date, {
    estimatedWaitMinutes: estimateWaitMinutes(waiting),
    congestion: waiting > 8 ? 'red' : waiting > 4 ? 'yellow' : 'green',
  });

  return result.modifiedCount > 0;
}

// Emergency Priority (pushes a patient to the top of waiting queue)
export async function setEmergencyPriority(date: string, bookingId: string): Promise<boolean> {
  const db = await getDb();

  // Find minimum priority currently in the date's queue entries
  const first = await db.collection<QueueEntry>(COLLECTIONS.queue)
    .find({ date })
    .sort({ priority: 1 })
    .limit(1)
    .toArray();

  const minPriority = first.length ? first[0].priority ?? 0 : 0;

  const result = await db.collection(COLLECTIONS.queue).updateOne(
    { date, bookingId },
    { $set: { priority: minPriority - 1 } }
  );
  return result.modifiedCount > 0;
}

// Reorder queue entries
export async function reorderQueueEntries(date: string, bookingIdsOrder: string[]): Promise<boolean> {
  const db = await getDb();
  const bulkOps = bookingIdsOrder.map((id, index) => ({
    updateOne: {
      filter: { date, bookingId: id },
      update: { $set: { priority: index - 1000 } }, // Shift priorities to negative range for custom orders
    }
  }));

  if (bulkOps.length === 0) return true;
  const result = await db.collection(COLLECTIONS.queue).bulkWrite(bulkOps);
  return result.modifiedCount > 0;
}

// Remove patient from queue
export async function removeQueueEntry(date: string, bookingId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTIONS.queue).deleteOne({ date, bookingId });

  const waiting = await db.collection(COLLECTIONS.queue).countDocuments({
    date,
    status: 'waiting',
  });

  await updateDailyQueue(date, {
    estimatedWaitMinutes: estimateWaitMinutes(waiting),
    congestion: waiting > 8 ? 'red' : waiting > 4 ? 'yellow' : 'green',
  });

  return result.deletedCount > 0;
}

export async function getPublicQueueSnapshot(date: string) {
  try {
    const [daily, entries] = await Promise.all([
      getDailyQueue(date),
      getQueueEntries(date),
    ]);

    const waiting = entries.filter((e) => e.status === 'waiting');
    const serving = entries.find((e) => e.status === 'serving' || e.status === 'consulting');

    return {
      currentToken: daily.currentToken,
      servingPatient: serving
        ? { token: 1, firstName: serving.name?.trim().split(/\s+/)[0] || 'Patient' }
        : null,
      totalWaiting: waiting.length,
      totalToday: daily.totalPatientsToday,
      estimatedWaitMinutes: daily.estimatedWaitMinutes,
      congestion: daily.congestion,
      message: daily.message,
      lastUpdated: daily.lastUpdated,
      status: daily.status || 'active', // Active, Paused, Away
      queuePreview: waiting.map((e, idx) => ({
        token: idx + 1,
        firstName: e.name?.trim().split(/\s+/)[0] || 'Patient',
        position: idx + 1,
        status: e.status,
      })),
    };
  } catch (error) {
    console.error('Failed to get public queue snapshot:', error);
    return {
      currentToken: 0,
      servingPatient: null,
      totalWaiting: 0,
      totalToday: 0,
      estimatedWaitMinutes: 0,
      congestion: 'green' as const,
      message: 'Walk-ins open.',
      lastUpdated: new Date().toISOString(),
      status: 'active' as const,
      queuePreview: [],
    };
  }
}

function initials(name: string): string {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

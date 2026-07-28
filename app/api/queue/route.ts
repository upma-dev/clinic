import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDailyQueue, updateDailyQueue, getQueueEntries } from '@/lib/db/queue';
import { getPublicQueueSnapshot } from '@/lib/db/queue';
import { todayISO } from '@/lib/slots';
import type { QueueState } from '@/lib/types';

/** Public queue snapshot — polls every 5–10 seconds from website */
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') || todayISO();
    const snapshot = await getPublicQueueSnapshot(date);

    const legacy: QueueState = {
      currentPatient: snapshot.currentToken,
      totalPatientsToday: snapshot.totalToday,
      estimatedWaitTime: snapshot.estimatedWaitMinutes,
      status: snapshot.congestion,
      message: snapshot.message,
      lastUpdated: snapshot.lastUpdated,
    };

    return NextResponse.json({ ...snapshot, legacy });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Queue unavailable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Staff/Doctor: update broadcast message or manual queue override */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const date = body.date || todayISO();

    const updated = await updateDailyQueue(date, {
      message: body.message,
      congestion: body.congestion || body.status,
      estimatedWaitMinutes: body.estimatedWaitMinutes ?? body.estimatedWaitTime,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Admin: full queue entries list */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get('date') || todayISO();
  const [daily, entries] = await Promise.all([
    getDailyQueue(date),
    getQueueEntries(date),
  ]);

  return NextResponse.json({ daily, entries });
}

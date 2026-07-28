import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { advanceQueue } from '@/lib/db/queue';
import { todayISO } from '@/lib/slots';
import { createNotification } from '@/lib/db/notifications';

/** Staff taps "Next Patient" — advances queue in real time */
export async function POST() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'staff' && session.role !== 'doctor')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const date = todayISO();
    const result = await advanceQueue(date);

    // Notify queue progression
    if (result.served || result.next) {
      const nowServing = result.next ? `${result.next.name} (Token #${result.next.tokenNumber})` : 'None';
      await createNotification(
        'queue_update',
        'Queue Advanced',
        `Queue advanced. Now serving: ${nowServing}. Congestion is ${result.queue.congestion}.`
      );
    }

    return NextResponse.json({
      success: true,
      currentToken: result.queue.currentToken,
      nextPatientName: result.queue.nextPatientName,
      estimatedWaitMinutes: result.queue.estimatedWaitMinutes,
      congestion: result.queue.congestion,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Queue advance failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

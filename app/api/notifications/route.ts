import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from '@/lib/db/notifications';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const list = await getNotifications();
    return NextResponse.json(list);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, id } = body;

    if (action === 'mark_read') {
      if (!id) {
        return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
      }
      await markAsRead(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_all_read') {
      await markAllAsRead();
      return NextResponse.json({ success: true });
    }

    if (action === 'clear_all') {
      if (session.role !== 'doctor') {
        return NextResponse.json({ error: 'Only doctor can clear history' }, { status: 403 });
      }
      await clearAllNotifications();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

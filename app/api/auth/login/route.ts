import { NextRequest, NextResponse } from 'next/server';
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  verifyPin,
  getSession,
} from '@/lib/auth';
import type { AdminRole } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { role, pin } = (await req.json()) as { role: AdminRole; pin: string };

    if (!role || !pin || !['staff', 'doctor'].includes(role)) {
      return NextResponse.json({ error: 'Invalid login request' }, { status: 400 });
    }

    if (!verifyPin(role, pin)) {
      return NextResponse.json({ error: 'Incorrect PIN for this role' }, { status: 401 });
    }

    const token = await createSession(role);
    await setSessionCookie(token);

    return NextResponse.json({ success: true, role });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, role: session.role });
}

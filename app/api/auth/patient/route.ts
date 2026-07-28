import { NextRequest, NextResponse } from 'next/server';
import {
  createPatientSession,
  setPatientSessionCookie,
  clearPatientSessionCookie,
  getPatientSession,
} from '@/lib/patientAuth';

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean phone number format
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }

    // Allow any code or check for simulated OTP '1234'
    if (code && code !== '1234') {
      return NextResponse.json({ error: 'Incorrect verification code. Use 1234.' }, { status: 401 });
    }

    const token = await createPatientSession(cleanPhone);
    await setPatientSessionCookie(token);

    return NextResponse.json({ success: true, phone: cleanPhone });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearPatientSessionCookie();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getPatientSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, phone: session.phone });
}

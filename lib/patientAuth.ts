import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'skinhub_patient_session';
const SESSION_DAYS = 7;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'fallback-secret-at-least-16-chars-long';
  return new TextEncoder().encode(secret);
}

export interface PatientSessionPayload {
  phone: string;
  exp: number;
}

export async function createPatientSession(phone: string): Promise<string> {
  const token = await new SignJWT({ phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
  return token;
}

export async function verifyPatientSession(token: string): Promise<PatientSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { phone: payload.phone as string, exp: payload.exp as number };
  } catch {
    return null;
  }
}

export async function getPatientSession(): Promise<PatientSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPatientSession(token);
}

export async function setPatientSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearPatientSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AdminRole } from './types';

const COOKIE_NAME = 'skinhub_admin_session';
const SESSION_HOURS = 12;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET must be at least 16 characters in .env.local');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  role: AdminRole;
  exp: number;
}

export async function createSession(role: AdminRole): Promise<string> {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret());
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { role: payload.role as AdminRole, exp: payload.exp as number };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function verifyPin(role: AdminRole, pin: string): boolean {
  const staffPin = process.env.STAFF_PIN;
  const doctorPin = process.env.DOCTOR_PIN;

  if (role === 'staff') {
    return !!staffPin && pin === staffPin;
  }
  if (role === 'doctor') {
    return !!doctorPin && pin === doctorPin;
  }
  return false;
}

export async function requireRole(allowed: AdminRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !allowed.includes(session.role)) {
    throw new Error('Unauthorized');
  }
  return session;
}

export { COOKIE_NAME };

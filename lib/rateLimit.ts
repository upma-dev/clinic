import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

/**
 * Standard Operating Procedure (SOP) HTTP Rate Limiting Architecture
 * APPZETO MERN Standard Version: 1.0
 */

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  max: number;
  devMax: number;
  authWindowMs: number;
  authMax: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  const enabled = process.env.RATE_LIMIT_ENABLED !== 'false';
  const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX || '3500', 10);
  const devMax = parseInt(process.env.RATE_LIMIT_DEV_MAX || '2000', 10);
  
  const authWindowMinutes = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW || '15', 10);
  const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10);

  return {
    enabled,
    windowMs: windowMinutes * 60 * 1000,
    max,
    devMax,
    authWindowMs: authWindowMinutes * 60 * 1000,
    authMax,
  };
}

// In-Memory Token Bucket Store for Rate Limiting
interface MemoryStoreEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryStoreEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now > entry.resetTime) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Extracts the real client IP address following Nginx reverse proxy headers (SOP Section 4 & 6).
 */
export function getRealClientIp(req: NextRequest): string {
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp && xRealIp.trim() !== '') {
    return xRealIp.trim();
  }

  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim());
    if (ips.length > 0 && ips[0] !== '') {
      return ips[0];
    }
  }

  return (req as any).ip || '127.0.0.1';
}

/**
 * Log blocked requests per APPZETO MERN SOP Section 10
 */
function logBlockedRequest(
  ip: string,
  route: string,
  method: string,
  userId: string | null,
  userAgent: string | null
) {
  const logData = {
    event: 'RATE_LIMIT_BLOCKED',
    timestamp: new Date().toISOString(),
    ip,
    route,
    method,
    userId: userId || 'anonymous',
    userAgent: userAgent || 'unknown',
  };
  console.warn(`[HTTP 429] Rate limit exceeded:`, JSON.stringify(logData));
}

/**
 * Standard HTTP 429 Response (SOP Section 9)
 * Never exposes internal limiter configuration or remaining attempts.
 */
export function createRateLimitExceededResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Checks rate limit for a specific key.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true; // Allowed
  }

  if (entry.count >= limit) {
    return false; // Limit exceeded
  }

  entry.count += 1;
  return true; // Allowed
}

/**
 * Category A — Authentication Rate Limiter Helper (AUTH_RATE_LIMIT_WINDOW & AUTH_RATE_LIMIT_MAX)
 */
export function handleAuthRateLimit(req: NextRequest): NextResponse | null {
  const config = getRateLimitConfig();
  if (!config.enabled) return null;

  const clientIp = getRealClientIp(req);
  const key = `auth:${clientIp}`;
  const allowed = checkRateLimit(key, config.authMax, config.authWindowMs);

  if (!allowed) {
    const route = req.nextUrl.pathname;
    const method = req.method;
    const userAgent = req.headers.get('user-agent');
    logBlockedRequest(clientIp, route, method, null, userAgent);
    return createRateLimitExceededResponse();
  }

  return null;
}

/**
 * Category C — Private API Rate Limiter Helper (User_ID + Real_Client_IP)
 */
export async function handlePrivateRateLimit(
  req: NextRequest,
  userId?: string | null
): Promise<NextResponse | null> {
  const config = getRateLimitConfig();
  if (!config.enabled) return null;

  const isDev = process.env.NODE_ENV === 'development';
  const effectiveLimit = isDev ? config.devMax : config.max;
  const clientIp = getRealClientIp(req);

  // If userId is not provided, try resolving from session
  let finalUserId = userId;
  if (!finalUserId) {
    try {
      const session = await getSession();
      if (session) {
        finalUserId = (session as any).userId || session.role || 'authenticated';
      }
    } catch {}
  }

  const userKey = finalUserId || 'anon_private';
  const rateLimitKey = `${userKey}:${clientIp}`;

  const allowed = checkRateLimit(rateLimitKey, effectiveLimit, config.windowMs);

  if (!allowed) {
    const route = req.nextUrl.pathname;
    const method = req.method;
    const userAgent = req.headers.get('user-agent');
    logBlockedRequest(clientIp, route, method, userKey, userAgent);
    return createRateLimitExceededResponse();
  }

  return null;
}

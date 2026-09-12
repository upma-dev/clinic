import { NextRequest, NextResponse } from 'next/server';
import {
  handleAuthRateLimit,
  handlePrivateRateLimit,
} from '@/lib/rateLimit';

// Category A — Authentication Routes (Dedicated Auth Limiter: AUTH_RATE_LIMIT_WINDOW & AUTH_RATE_LIMIT_MAX)
const AUTH_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// Category B — Public Routes (No Rate Limiter per SOP Section 2 Category B)
const PUBLIC_ROUTES = [
  '/api/settings',
  '/api/cms',
  '/api/blogs',
  '/api/appointments/slots',
  '/api/health',
  '/api/ready',
];

function applyCacheAndSecurityHeaders(
  res: NextResponse,
  req: NextRequest,
  isPublicRoute: boolean
): NextResponse {
  // Global Security Headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');

  // Caching Policy
  if (isPublicRoute && req.method === 'GET') {
    // Public read operations: short browser cache, shared CDN cache, background revalidation
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.headers.set('Vary', 'Accept-Encoding');
  } else {
    // Private / Auth / Mutation APIs: STRICT NO-STORE for strong security
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Vary', 'Authorization, Cookie');
  }

  return res;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only apply rate limiting & caching header middleware to /api/ endpoints
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 1. Category B — Public APIs: Unrestricted Rate Limit + Public Cache Header
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isPublicRoute) {
    const res = NextResponse.next();
    return applyCacheAndSecurityHeaders(res, req, true);
  }

  // 2. Category A — Authentication APIs: Dedicated Auth Rate Limiter + Private No-Cache Header
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isAuthRoute) {
    const authLimitResult = handleAuthRateLimit(req);
    if (authLimitResult) {
      return applyCacheAndSecurityHeaders(authLimitResult, req, false);
    }
    const res = NextResponse.next();
    return applyCacheAndSecurityHeaders(res, req, false);
  }

  // 3. Category C — Private APIs: Standard Rate Limiter (<User_ID>:<Real_Client_IP>) + Private No-Cache Header
  const sessionCookie = req.cookies.get('session')?.value || req.cookies.get('auth_token')?.value;
  let userId: string | null = null;
  if (sessionCookie) {
    try {
      const parts = sessionCookie.split('.');
      if (parts.length >= 2) {
        const parsed = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        userId = parsed?.userId || parsed?.id || parsed?.role || null;
      }
    } catch {
      userId = sessionCookie.substring(0, 12);
    }
  }

  const privateLimitResult = await handlePrivateRateLimit(req, userId);
  if (privateLimitResult) {
    return applyCacheAndSecurityHeaders(privateLimitResult, req, false);
  }

  const res = NextResponse.next();
  return applyCacheAndSecurityHeaders(res, req, false);
}

export const config = {
  matcher: '/api/:path*',
};


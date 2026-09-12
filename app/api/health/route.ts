import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { initRenderKeepAlive } from '@/lib/keepAlive';

export async function GET() {
  // Initialize keep-alive timer if running in production / Render
  initRenderKeepAlive();

  const cacheStatus = cache.getStatus();

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Skin Hub API',
    cache: {
      mode: cacheStatus.redisActive ? 'Upstash Redis + Fallback Memory' : 'In-Memory Only (Redis keys missing)',
      localMemoryKeys: cacheStatus.localMemoryKeys,
    },
    renderKeepAlive: {
      active: true,
      renderUrl: process.env.RENDER_EXTERNAL_URL || 'Not on Render (Local Dev)',
    },
  });
}

/**
 * Render Keep-Alive & Self-Ping Utility
 * Automatically pings the application endpoint periodically to prevent Render Free Tier from going to sleep.
 */

let keepAliveStarted = false;

export function initRenderKeepAlive(): void {
  if (keepAliveStarted) return;
  keepAliveStarted = true;

  // Render sets RENDER_EXTERNAL_URL automatically on deployment e.g. https://skin-hub.onrender.com
  const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    return;
  }

  const pingUrl = `${baseUrl.replace(/\/$/, '')}/api/health`;
  const PING_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes (Render sleeps after 15 min idle)

  console.log(`[KEEP-ALIVE] Initializing Render self-ping interval every 12 mins targeting: ${pingUrl}`);

  const interval = setInterval(async () => {
    try {
      const res = await fetch(pingUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'SkinHub-SelfPing/1.0' },
      });
      if (res.ok) {
        console.log(`[KEEP-ALIVE] Self-ping successful at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.warn('[KEEP-ALIVE] Self-ping failed:', err);
    }
  }, PING_INTERVAL_MS);

  if (interval.unref) {
    interval.unref(); // Ensure it doesn't prevent graceful shutdown
  }
}

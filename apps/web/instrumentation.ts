/**
 * Next.js Instrumentation — runs once on server startup.
 * Sets up two self-scheduling timers:
 *   1. /api/cron/sync         every 5 minutes (existing — signals, telegram, etc.)
 *   2. /api/cron/execute      every 60 seconds (Pilot — entry execution)
 * Replaces the Vercel cron — works on Railway or any hosting.
 */

export async function register() {
  // Only run on the server, not during build or in edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const SYNC_INTERVAL_MS = 5 * 60 * 1000;
    const PILOT_INTERVAL_MS = 60 * 1000;

    // Prewarm caches on startup (non-blocking)
    Promise.all([
      import('./lib/signal-history-cache').then(({ getCachedHistory }) => getCachedHistory()),
      import('./app/lib/atr-calibration-cache').then(({ refreshAtrCalibration }) => refreshAtrCalibration()),
    ]).catch(() => undefined);

    // Self-calls must loopback to the local Next.js process. Going out through
    // NEXT_PUBLIC_BASE_URL (the public URL) hits Cloudflare's bot rules and
    // returns 403, which silently kills every scheduled cron. Only honor an
    // explicit APP_URL override (for non-loopback test setups); otherwise loopback.
    const baseUrl = () =>
      process.env.APP_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;

    const cronHeaders = (): Record<string, string> => {
      const headers: Record<string, string> = {};
      const secret = process.env.CRON_SECRET;
      if (secret) headers['authorization'] = `Bearer ${secret}`;
      return headers;
    };

    const runSync = async () => {
      try {
        const res = await fetch(`${baseUrl()}/api/cron/sync`, { headers: cronHeaders(), signal: AbortSignal.timeout(55000) });
        if (res.ok) {
          const data = await res.json();
          console.log(`[cron] sync completed:`, JSON.stringify(data?.ran ?? []));
        } else {
          console.error(`[cron] sync failed: ${res.status}`);
        }
      } catch (err) {
        console.error(`[cron] sync error:`, err instanceof Error ? err.message : err);
      }
    };

    const runPilotExecute = async () => {
      // Skip the broker round-trip when the kill switch is on.
      if ((process.env.EXECUTION_MODE ?? 'disabled').toLowerCase() === 'disabled') return;
      try {
        const res = await fetch(`${baseUrl()}/api/cron/execute`, { headers: cronHeaders(), signal: AbortSignal.timeout(50000) });
        if (!res.ok) console.error(`[cron] pilot/execute failed: ${res.status}`);
      } catch (err) {
        console.error(`[cron] pilot/execute error:`, err instanceof Error ? err.message : err);
      }

      // Run position-manager right after execute so they share the same minute boundary.
      try {
        const res = await fetch(`${baseUrl()}/api/cron/manage-positions`, { headers: cronHeaders(), signal: AbortSignal.timeout(50000) });
        if (!res.ok) console.error(`[cron] pilot/manage-positions failed: ${res.status}`);
      } catch (err) {
        console.error(`[cron] pilot/manage-positions error:`, err instanceof Error ? err.message : err);
      }
    };

    // Wait 30s for server to be ready, then start both intervals.
    setTimeout(() => {
      console.log('[cron] Starting self-scheduled crons (sync 5m, pilot 60s)');
      runSync();
      setInterval(runSync, SYNC_INTERVAL_MS);
      // Stagger pilot 30s after sync to avoid overlapping rate-limit windows on cold start.
      setTimeout(() => {
        runPilotExecute();
        setInterval(runPilotExecute, PILOT_INTERVAL_MS);
      }, 30_000);
    }, 30_000);
  }
}

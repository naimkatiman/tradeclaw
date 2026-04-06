/**
 * Next.js Instrumentation — runs once on server startup.
 * Sets up a self-scheduling cron that calls /api/cron/sync every 5 minutes.
 * Replaces the Vercel cron — works on Railway or any hosting.
 */

export async function register() {
  // Only run on the server, not during build or in edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const runCron = async () => {
      try {
        const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
        const headers: Record<string, string> = {};
        const secret = process.env.CRON_SECRET;
        if (secret) headers['authorization'] = `Bearer ${secret}`;

        const res = await fetch(`${baseUrl}/api/cron/sync`, { headers, signal: AbortSignal.timeout(55000) });
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

    // Wait 30s for server to be ready, then start the interval
    setTimeout(() => {
      console.log('[cron] Starting self-scheduled cron (every 5 min)');
      runCron(); // Run immediately on startup
      setInterval(runCron, INTERVAL_MS);
    }, 30_000);
  }
}

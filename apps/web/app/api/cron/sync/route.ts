import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '../../../../lib/cron-auth';

// ── Schedule helpers ──────────────────────────────────────────

function currentHourUTC(): number {
  return new Date().getUTCHours();
}

function currentMinuteUTC(): number {
  return new Date().getUTCMinutes();
}

/** Returns true if current UTC hour is divisible by `interval` and minute < 10 (within the 5-min cron window) */
function isHourSlot(interval: number): boolean {
  return currentHourUTC() % interval === 0 && currentMinuteUTC() < 10;
}

// ── Internal fetch helper ─────────────────────────────────────

async function callInternal(
  path: string,
  _request: NextRequest,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    // Loopback to the local Next.js process. The same fix applies here as in
    // instrumentation.ts: routing self-calls through NEXT_PUBLIC_BASE_URL hits
    // Cloudflare's bot rules and returns 403/HTML, killing every fanout. Honor
    // APP_URL only as an explicit override (non-loopback test setups).
    const baseUrl =
      process.env.APP_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = process.env.CRON_SECRET;
    if (secret) headers['authorization'] = `Bearer ${secret}`;

    const res = await fetch(`${baseUrl}${path}`, { headers });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch failed' };
  }
}

// ── Route handler ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const results: Record<string, unknown> = {};
  const hour = currentHourUTC();
  const minute = currentMinuteUTC();

  // 1. Signals — every run (record new signals + resolve pending)
  results.signals = await callInternal('/api/cron/signals', request);

  // 2. Telegram broadcast — every 4 hours (0, 4, 8, 12, 16, 20)
  if (isHourSlot(4)) {
    results.telegram = await callInternal('/api/cron/telegram', request);
  }

  // 3. Daily digest — once at 08:00 UTC
  if (hour === 8 && minute < 10) {
    results.dailyDigest = await callInternal('/api/cron/daily-digest', request);
  }

  // 3b. Trial-ending reminder — once daily at 09:00 UTC. Catches anyone
  //     whose 7-day trial expires in roughly 24 hours.
  if (hour === 9 && minute < 10) {
    results.trialReminders = await callInternal('/api/cron/trial-reminders', request);
  }

  // 4. SMS alerts — every 6 hours (0, 6, 12, 18)
  if (isHourSlot(6)) {
    results.smsAlerts = await callInternal('/api/cron/sms-alerts', request);
  }

  // 5. Daily social summary — once at 00:00 UTC
  if (hour === 0 && minute < 10) {
    results.socialDaily = await callInternal('/api/cron/social/daily', request);
  }

  // 5b. Pilot symbol universe screen — once daily, anchored at 00:05 UTC.
  //     Window is 5 ≤ minute < 10 so exactly one 5-min sync tick lands inside,
  //     keeping the daily Binance kline-fetch load to a single run.
  if (hour === 0 && minute >= 5 && minute < 10) {
    results.universe = await callInternal('/api/cron/universe', request);
  }

  // 6. Weekly social summary — Sunday at 18:00 UTC
  const dayOfWeek = new Date().getUTCDay();
  if (dayOfWeek === 0 && hour === 18 && minute < 10) {
    results.socialWeekly = await callInternal('/api/cron/social/weekly', request);
  }

  return NextResponse.json({
    ok: true,
    ran: Object.keys(results),
    results,
    timestamp: new Date().toISOString(),
  });
}

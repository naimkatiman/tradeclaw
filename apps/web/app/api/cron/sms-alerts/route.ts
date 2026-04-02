import { NextRequest, NextResponse } from 'next/server';
import { getActiveSmsSubscribers } from '@/lib/sms-subscribers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/sms-alerts — Vercel Cron handler (every 6h)
 * Fetches top signals, matches against SMS subscribers, sends SMS via /api/sms/send.
 */
export async function GET(request: NextRequest) {
  // Auth guard — Vercel cron sends CRON_SECRET as bearer token
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const subscribers = await getActiveSmsSubscribers();

    if (subscribers.length === 0) {
      return NextResponse.json({
        sent: 0,
        total: 0,
        error: 'No active SMS subscribers',
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch top signals from signals API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
    let signals: Array<{
      symbol: string;
      direction: string;
      confidence: number;
      entry: number;
      takeProfit: number;
      stopLoss: number;
    }> = [];

    try {
      const sigRes = await fetch(`${baseUrl}/api/signals?minConfidence=60`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        signals = Array.isArray(sigData) ? sigData : (sigData.signals ?? []);
      }
    } catch {
      // Fallback: empty signals array means no SMS sent
    }

    if (signals.length === 0) {
      return NextResponse.json({
        sent: 0,
        total: subscribers.length,
        error: 'No signals above threshold',
        timestamp: new Date().toISOString(),
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subscribers) {
      // Filter signals matching this subscriber's pair + confidence prefs
      const matching = signals.filter(
        (s) =>
          sub.pairs.includes(s.symbol) &&
          s.confidence >= sub.minConfidence,
      );

      if (matching.length === 0) continue;

      // Build SMS message (compact, 160-char SMS friendly)
      const top3 = matching.slice(0, 3);
      const lines = top3.map(
        (s) =>
          `${s.direction === 'BUY' ? '📈' : '📉'} ${s.symbol} ${s.direction} ${s.confidence}% | Entry: $${s.entry}`,
      );
      const message = `TradeClaw Alerts\n${lines.join('\n')}\n\nhttps://tradeclaw.win/screener`;

      try {
        const smsRes = await fetch(`${baseUrl}/api/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: sub.phone, message }),
        });
        const smsData = (await smsRes.json()) as { sent: boolean; error?: string };
        if (smsData.sent) {
          sentCount++;
        } else {
          errors.push(`${sub.phone}: ${smsData.error ?? 'unknown'}`);
        }
      } catch (err) {
        errors.push(`${sub.phone}: ${err instanceof Error ? err.message : 'fetch error'}`);
      }
    }

    return NextResponse.json({
      sent: sentCount,
      total: subscribers.length,
      signalsFound: signals.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { sent: 0, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

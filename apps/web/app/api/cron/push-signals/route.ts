import { NextRequest, NextResponse } from 'next/server';
import { getSignals } from '../../../lib/signals';
import { getAllExpoTokens } from '../../../../lib/expo-push-tokens';
import { dispatchSignalPushes } from '../../../../lib/expo-push-sender';
import { requireCronAuth } from '../../../../lib/cron-auth';
import { HIGH_CONFIDENCE_THRESHOLD } from '../../../../lib/signal-thresholds';

// ---------------------------------------------------------------------------
// GET /api/cron/push-signals — Vercel/GitHub Actions cron handler
// Also supports POST for manual trigger.
// ---------------------------------------------------------------------------

async function handler(request: NextRequest): Promise<NextResponse> {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const { signals } = await getSignals({ minConfidence: HIGH_CONFIDENCE_THRESHOLD });

    if (signals.length === 0) {
      return NextResponse.json({
        pushed: false,
        signalsProcessed: 0,
        totalMessages: 0,
        sent: 0,
        failed: 0,
        reason: 'No high-confidence signals above threshold',
        timestamp: new Date().toISOString(),
      });
    }

    // Only push real (non-synthetic) signals
    const realSignals = signals.filter((s) => s.dataQuality === 'real');

    if (realSignals.length === 0) {
      return NextResponse.json({
        pushed: false,
        signalsProcessed: 0,
        totalMessages: 0,
        sent: 0,
        failed: 0,
        reason: 'No real-data signals available',
        timestamp: new Date().toISOString(),
      });
    }

    const tokens = await getAllExpoTokens();

    if (tokens.length === 0) {
      return NextResponse.json({
        pushed: false,
        signalsProcessed: realSignals.length,
        totalMessages: 0,
        sent: 0,
        failed: 0,
        reason: 'No registered Expo push tokens',
        timestamp: new Date().toISOString(),
      });
    }

    const result = await dispatchSignalPushes(realSignals, tokens);

    return NextResponse.json({
      pushed: result.sent > 0,
      signalsProcessed: result.signalsProcessed,
      totalMessages: result.totalMessages,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        pushed: false,
        error: err instanceof Error ? err.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

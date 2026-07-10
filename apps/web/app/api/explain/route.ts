import { NextRequest, NextResponse } from 'next/server';
import { generateSignalExplanation } from '../../lib/signal-explainer';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { getPreviousDirectionAsync } from '../../../lib/signal-history';
import { check as rateLimitCheck } from '../../../lib/rate-limit';
import type { TradingSignal } from '../../lib/signals';

// Abuse guard for the LLM call — not a tier gate. One generous limit for
// every caller (the tier system is gone).
const EXPLAIN_MAX_PER_WINDOW = 50;
const EXPLAIN_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve the caller's rate-limit key. Auth'd → userId. Otherwise the
 * trust-boundary client IP from x-forwarded-for (first hop) with a
 * request.ip fallback.
 */
function rateLimitKey(req: NextRequest, userId: string | undefined): string {
  if (userId) return `user:${userId}`;
  const fwd = req.headers.get('x-forwarded-for');
  const firstHop = fwd?.split(',')[0]?.trim();
  return `ip:${firstHop || req.headers.get('x-real-ip') || 'anon'}`;
}

/**
 * Abuse guard: every caller gets the same rolling window on the LLM call.
 * Returns a NextResponse when the caller is denied; returns null when
 * the call should proceed.
 */
async function enforceExplainQuota(req: NextRequest): Promise<NextResponse | null> {
  const { readSessionFromRequest } = await import('../../../lib/user-session');
  const session = readSessionFromRequest(req);
  const key = rateLimitKey(req, session?.userId);
  const decision = await rateLimitCheck(key, { max: EXPLAIN_MAX_PER_WINDOW, windowMs: EXPLAIN_WINDOW_MS });

  if (!decision.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        reason: `AI Analysis is limited to ${EXPLAIN_MAX_PER_WINDOW} calls per 24 hours.`,
        limit: {
          kind: 'rate',
          used: decision.used,
          max: EXPLAIN_MAX_PER_WINDOW,
          windowHours: 24,
        },
      },
      { status: 429 },
    );
  }
  return null;
}

interface ExplainBySignal {
  signal: TradingSignal;
}

interface ExplainBySymbol {
  symbol: string;
  timeframe: string;
}

type ExplainBody = ExplainBySignal | ExplainBySymbol;

function isFullSignal(body: ExplainBody): body is ExplainBySignal {
  return 'signal' in body && body.signal != null;
}

async function buildResponse(signal: TradingSignal) {
  const explanation = generateSignalExplanation(signal);

  // Flip detection: if the most recent prior signal (within 3 days) on the
  // same symbol+TF pointed the opposite way, surface it so the card can
  // explain the flip instead of quietly inverting. Stale priors are suppressed
  // — calling a 2-week-old opposite signal a "flip" misleads the reader.
  let flipFrom: 'BUY' | 'SELL' | null = null;
  let flipAgeMs: number | null = null;
  try {
    const emittedAtMs = Date.parse(signal.timestamp);
    if (Number.isFinite(emittedAtMs)) {
      const prior = await getPreviousDirectionAsync(signal.symbol, signal.timeframe, emittedAtMs);
      if (prior && prior.direction !== signal.direction) {
        flipFrom = prior.direction;
        flipAgeMs = prior.ageMs;
      }
    }
  } catch {
    // History lookup failed — flip info is best-effort, don't fail the request.
  }

  return NextResponse.json({
    markdown: explanation.markdown,
    summary: explanation.summary,
    confluenceScore: explanation.confluenceScore,
    riskReward: explanation.riskReward,
    flipFrom,
    flipAgeMs,
    signal,
  });
}

// GET /api/explain?symbol=XAUUSD&timeframe=H1
export async function GET(req: NextRequest) {
  try {
    const denial = await enforceExplainQuota(req);
    if (denial) return denial;

    const { searchParams } = req.nextUrl;
    const symbol = searchParams.get('symbol')?.toUpperCase();
    const timeframe = searchParams.get('timeframe') || 'H1';

    if (!symbol) {
      return NextResponse.json({ error: 'symbol query parameter is required' }, { status: 400 });
    }

    const { signals } = await getTrackedSignalsForRequest(req, { symbol, timeframe });
    const signal = signals[0] ?? null;

    if (!signal) {
      return NextResponse.json(
        { error: `No active signal found for ${symbol} on ${timeframe}` },
        { status: 404 }
      );
    }

    return await buildResponse(signal);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denial = await enforceExplainQuota(req);
  if (denial) return denial;

  let body: ExplainBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let signal: TradingSignal | null = null;

  if (isFullSignal(body)) {
    signal = body.signal;
  } else if ('symbol' in body && 'timeframe' in body) {
    const { symbol, timeframe } = body as ExplainBySymbol;
    if (!symbol || !timeframe) {
      return NextResponse.json({ error: 'symbol and timeframe are required' }, { status: 400 });
    }
    const { signals } = await getTrackedSignalsForRequest(req, { symbol: symbol.toUpperCase(), timeframe });
    signal = signals[0] ?? null;
  }

  if (!signal) {
    return NextResponse.json(
      {
        error:
          'No signal found. Provide a full signal object or a symbol+timeframe pair that has an active signal.',
      },
      { status: 404 }
    );
  }

  return buildResponse(signal);
}

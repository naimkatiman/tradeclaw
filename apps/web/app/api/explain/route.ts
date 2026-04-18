import { NextRequest, NextResponse } from 'next/server';
import { generateSignalExplanation } from '../../lib/signal-explainer';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { getPreviousDirectionAsync } from '../../../lib/signal-history';
import type { TradingSignal } from '../../lib/signals';

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

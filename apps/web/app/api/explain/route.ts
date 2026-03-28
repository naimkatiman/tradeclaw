import { NextRequest, NextResponse } from 'next/server';
import { generateSignalExplanation } from '../../lib/signal-explainer';
import { getTrackedSignals } from '../../../lib/tracked-signals';
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

function buildResponse(signal: TradingSignal) {
  const explanation = generateSignalExplanation(signal);
  return NextResponse.json({
    markdown: explanation.markdown,
    summary: explanation.summary,
    confluenceScore: explanation.confluenceScore,
    riskReward: explanation.riskReward,
    signal,
  });
}

// GET /api/explain?symbol=XAUUSD&timeframe=H1
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get('symbol')?.toUpperCase();
  const timeframe = searchParams.get('timeframe') || 'H1';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol query parameter is required' }, { status: 400 });
  }

  const { signals } = await getTrackedSignals({ symbol, timeframe });
  const signal = signals[0] ?? null;

  if (!signal) {
    return NextResponse.json(
      { error: `No active signal found for ${symbol} on ${timeframe}` },
      { status: 404 }
    );
  }

  return buildResponse(signal);
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
    const { signals } = await getTrackedSignals({ symbol: symbol.toUpperCase(), timeframe });
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

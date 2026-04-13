import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { readLiveSignals } from '../../../lib/signals-live';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../lib/signal-thresholds';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'X-TradeClaw-Endpoint': 'signal-of-the-day',
};

interface BestSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3?: number;
  timeframe: string;
  timestamp: string;
  rsi: number;
  rsiSignal: string;
  macdSignal: string;
  emaTrend: string;
}

function emptyPayload(reason: string, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(
    {
      date: new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      totalSignalsAnalyzed: 0,
      signalOfTheDay: null,
      reason,
    },
    { status: 200, headers: { ...BASE_HEADERS, ...extraHeaders } },
  );
}

async function pickFromTracked(): Promise<BestSignal | null> {
  const { signals } = await getTrackedSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE });
  if (!signals.length) return null;
  const best = [...signals].sort((a, b) => b.confidence - a.confidence)[0];
  return {
    id: best.id,
    symbol: best.symbol,
    direction: best.direction,
    confidence: best.confidence,
    entry: best.entry,
    stopLoss: best.stopLoss,
    takeProfit1: best.takeProfit1,
    takeProfit2: best.takeProfit2,
    takeProfit3: best.takeProfit3,
    timeframe: best.timeframe,
    timestamp: best.timestamp,
    rsi: best.indicators.rsi.value,
    rsiSignal: best.indicators.rsi.signal,
    macdSignal: best.indicators.macd.signal,
    emaTrend: best.indicators.ema.trend,
  };
}

async function pickFromLive(): Promise<{ best: BestSignal | null; stale: boolean; total: number }> {
  const live = await readLiveSignals();
  if (!live || !live.signals.length) return { best: null, stale: false, total: 0 };
  const eligible = live.signals.filter((s) => s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE);
  if (!eligible.length) return { best: null, stale: live.isStale, total: 0 };
  const top = [...eligible].sort((a, b) => b.confidence - a.confidence)[0];
  return {
    stale: live.isStale,
    total: eligible.length,
    best: {
      id: top.id,
      symbol: top.symbol,
      direction: top.signal,
      confidence: top.confidence,
      entry: top.entry,
      stopLoss: top.sl,
      takeProfit1: top.tp1,
      takeProfit2: top.tp2,
      takeProfit3: top.tp3,
      timeframe: top.timeframe,
      timestamp: top.timestamp,
      rsi: top.indicators?.rsi ?? 50,
      rsiSignal:
        (top.indicators?.rsi ?? 50) < 30
          ? 'oversold'
          : (top.indicators?.rsi ?? 50) > 70
            ? 'overbought'
            : 'neutral',
      macdSignal: (top.indicators?.macd_histogram ?? 0) >= 0 ? 'bullish' : 'bearish',
      emaTrend: top.indicators?.ema_trend ?? 'flat',
    },
  };
}

function formatResponse(best: BestSignal, total: number, stale: boolean) {
  const extraHeaders: Record<string, string> = {};
  if (stale) extraHeaders['X-Signal-Stale'] = 'true';

  return NextResponse.json(
    {
      date: new Date().toISOString().split('T')[0],
      generatedAt: new Date().toISOString(),
      totalSignalsAnalyzed: total,
      stale,
      signalOfTheDay: {
        id: best.id,
        symbol: best.symbol,
        direction: best.direction,
        confidence: best.confidence,
        entry: best.entry,
        stopLoss: best.stopLoss,
        takeProfit1: best.takeProfit1,
        takeProfit2: best.takeProfit2,
        takeProfit3: best.takeProfit3,
        timeframe: best.timeframe,
        timestamp: best.timestamp,
        indicators: {
          rsi: { value: best.rsi, signal: best.rsiSignal },
          macd: { signal: best.macdSignal },
          ema: { trend: best.emaTrend },
        },
        reason:
          `${best.symbol} shows the strongest setup today with ${best.confidence}% confidence. ` +
          `RSI at ${best.rsi.toFixed(1)} (${best.rsiSignal}), ` +
          `MACD ${best.macdSignal}, EMA trend ${best.emaTrend}. ` +
          `${best.direction === 'BUY' ? 'Bullish' : 'Bearish'} bias across indicators.`,
      },
      shareUrl: `https://tradeclaw.com/signal/${best.symbol}-${best.timeframe}-${best.direction}`,
      metadata: {
        source: 'TradeClaw AI Signal Engine',
        docs: 'https://tradeclaw.com/today',
      },
    },
    { status: 200, headers: { ...BASE_HEADERS, ...extraHeaders } },
  );
}

export async function GET() {
  // Path 1: fresh tracked signals
  try {
    const best = await pickFromTracked();
    if (best) return formatResponse(best, 1, false);
  } catch {
    // fall through
  }

  // Path 2: live file (fresh or stale — stale beats nothing)
  try {
    const { best, stale, total } = await pickFromLive();
    if (best) return formatResponse(best, total, stale);
  } catch {
    // fall through
  }

  return emptyPayload('No signals available', { 'X-Signal-Source': 'fallback' });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: BASE_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...BASE_HEADERS,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

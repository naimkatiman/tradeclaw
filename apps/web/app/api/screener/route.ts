import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { getMultiOHLCV } from '../../lib/ohlcv';
import { getTrackedSignals } from '../../../lib/tracked-signals';

export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  direction: 'BUY' | 'SELL';
  confidence: number;
  signalId: string;
  timeframe: string;
  rsi: number;
  macdHistogram: number;
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  emaStatus: string;
  ema20: number;
  ema50: number;
  sparkline: number[];
}

export interface ScreenerMeta {
  totalAssets: number;
  matching: number;
  strongest: { symbol: string; confidence: number; direction: 'BUY' | 'SELL' } | null;
  mostBullish: string | null;
  mostBearish: string | null;
  scannedAt: string;
  timeframe: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rsiMin = parseFloat(searchParams.get('rsiMin') || '0');
    const rsiMax = parseFloat(searchParams.get('rsiMax') || '100');
    const macdFilter = searchParams.get('macdFilter') || 'any';   // any | bullish | bearish
    const emaFilter = searchParams.get('emaFilter') || 'any';     // any | above_ema20 | below_ema20 | golden_cross
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');
    const timeframe = searchParams.get('timeframe') || 'H1';
    const direction = searchParams.get('direction') || 'all';     // all | BUY | SELL

    // Fetch signals for all symbols at the requested timeframe
    const { signals } = await getTrackedSignals({
      timeframe,
      direction: direction === 'all' ? undefined : direction,
      minConfidence,
    });

    // Fetch OHLCV for sparklines in parallel
    const symbolNames = SYMBOLS.map(s => s.symbol);
    const ohlcvData = await getMultiOHLCV(symbolNames, timeframe).catch(() => new Map<string, never>());

    const results: ScreenerResult[] = [];

    for (const signal of signals) {
      const { indicators, entry } = signal;
      const rsiValue = indicators.rsi.value;
      const macdSig = indicators.macd.signal;
      const ema20 = indicators.ema.ema20;
      const ema50 = indicators.ema.ema50;

      // RSI range filter
      if (rsiValue < rsiMin || rsiValue > rsiMax) continue;

      // MACD filter
      if (macdFilter === 'bullish' && macdSig !== 'bullish') continue;
      if (macdFilter === 'bearish' && macdSig !== 'bearish') continue;

      // EMA filter
      if (emaFilter === 'above_ema20' && entry <= ema20) continue;
      if (emaFilter === 'below_ema20' && entry >= ema20) continue;
      if (emaFilter === 'golden_cross' && ema20 <= ema50) continue;

      // Derive EMA status label
      let emaStatus = 'Mixed';
      if (entry > ema20 && ema20 > ema50) emaStatus = 'Golden Cross';
      else if (entry < ema20 && ema20 < ema50) emaStatus = 'Death Cross';
      else if (entry > ema20) emaStatus = 'Above EMA20';
      else if (entry < ema20) emaStatus = 'Below EMA20';

      // Get last 20 closes for sparkline
      const ohlcvEntry = (ohlcvData as Map<string, { candles: { close: number }[] }>).get(signal.symbol);
      const sparkline = ohlcvEntry
        ? ohlcvEntry.candles.slice(-20).map(c => c.close)
        : [];

      const symbolConfig = SYMBOLS.find(s => s.symbol === signal.symbol);

      results.push({
        symbol: signal.symbol,
        name: symbolConfig?.name ?? signal.symbol,
        price: signal.entry,
        direction: signal.direction,
        confidence: signal.confidence,
        signalId: signal.id,
        timeframe: signal.timeframe,
        rsi: rsiValue,
        macdHistogram: indicators.macd.histogram,
        macdSignal: macdSig,
        emaStatus,
        ema20,
        ema50,
        sparkline,
      });
    }

    // Deduplicate: keep highest-confidence signal per symbol
    const seen = new Map<string, ScreenerResult>();
    for (const r of results) {
      const existing = seen.get(r.symbol);
      if (!existing || r.confidence > existing.confidence) {
        seen.set(r.symbol, r);
      }
    }
    const deduped = Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);

    const strongest = deduped[0] ?? null;
    const mostBullish = deduped.filter(r => r.direction === 'BUY')[0]?.symbol ?? null;
    const mostBearish = deduped.filter(r => r.direction === 'SELL')[0]?.symbol ?? null;

    return NextResponse.json({
      results: deduped,
      meta: {
        totalAssets: SYMBOLS.length,
        matching: deduped.length,
        strongest: strongest
          ? { symbol: strongest.symbol, confidence: strongest.confidence, direction: strongest.direction }
          : null,
        mostBullish,
        mostBearish,
        scannedAt: new Date().toISOString(),
        timeframe,
      } satisfies ScreenerMeta,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

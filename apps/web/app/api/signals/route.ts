import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { readLiveSignals } from '../../../lib/signals-live';
import { fetchResolvedRegimeMap } from '../../../lib/regime-resolution';
import { filterSignalsByRegime, getDominantRegime } from '../../../lib/regime-filter';
// Re-export types for consumers that imported from here
export type { TradingSignal, IndicatorSummary } from '../../lib/signals';

// Responses are identical for everyone (the tier system is gone), but the
// route still runs per-request side effects (recording, alert fan-out) and
// reads the live signals file, so keep it dynamic.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Same response for everyone — let shared caches absorb it.
    const cacheControl = 'public, max-age=60, stale-while-revalidate=240';

    const { searchParams } = new URL(request.url);
    const symbolFilter = searchParams.get('symbol')?.toUpperCase();
    const timeframeFilter = searchParams.get('timeframe')?.toUpperCase() || searchParams.get('tf')?.toUpperCase();
    const directionFilter = searchParams.get('direction')?.toUpperCase() as 'BUY' | 'SELL' | null;
    const minConfidence = parseInt(searchParams.get('minConfidence') || searchParams.get('min_confidence') || '0');
    const minConfluence = parseInt(searchParams.get('min_confluence') || '0');

    // Validate symbol if provided
    if (symbolFilter && !SYMBOLS.some(s => s.symbol === symbolFilter)) {
      return NextResponse.json(
        { error: `Unknown symbol: ${symbolFilter}`, available: SYMBOLS.map(s => s.symbol) },
        { status: 400 }
      );
    }

    // Fetch regime data for direction filtering
    const resolved = await fetchResolvedRegimeMap();
    const regimeMap = resolved.regimes;
    const dominantRegime = getDominantRegime(regimeMap);

    // === PRIMARY: Read from live file (Python scanner) with coverage gate ===
    // Falls back to TA engine when the scanner output is degraded.
    const MIN_LIVE_SYMBOLS_CHECKED = 8;
    const liveData = await readLiveSignals();

    const liveCoverageOk = liveData && (liveData.stats?.symbols_checked ?? Infinity) >= MIN_LIVE_SYMBOLS_CHECKED;
    if (liveData && !liveData.isStale && liveData.signals.length > 0 && liveCoverageOk) {
      let signals = liveData.signals;

      // Apply filters
      if (symbolFilter) signals = signals.filter(s => s.symbol.toUpperCase().includes(symbolFilter));
      if (timeframeFilter) signals = signals.filter(s => s.timeframe.toUpperCase().includes(timeframeFilter));
      if (directionFilter) signals = signals.filter(s => s.signal === directionFilter);
      if (minConfidence > 0) signals = signals.filter(s => s.confidence >= minConfidence);
      if (minConfluence > 0) signals = signals.filter(s => (s.confluence_score ?? 1) >= minConfluence);

      // Map to the format the frontend expects (TradingSignal shape)
      let mapped = signals.map(s => ({
        id: s.id,
        symbol: s.symbol,
        timeframe: s.timeframe,
        direction: s.signal,           // frontend uses "direction" not "signal"
        confidence: s.confidence,
        entry: s.entry,
        stopLoss: s.sl,
        takeProfit1: s.tp1,
        takeProfit2: s.tp2,
        takeProfit3: s.tp3,
        reasons: s.reasons,
        agreeing_timeframes: s.agreeing_timeframes,
        confluence_score: s.confluence_score,
        indicators: s.indicators ? {
          rsi: s.indicators.rsi ? { value: s.indicators.rsi, signal: s.indicators.rsi < 30 ? 'oversold' : s.indicators.rsi > 70 ? 'overbought' : 'neutral' } : undefined,
          macd: s.indicators.macd_histogram ? { histogram: s.indicators.macd_histogram, signal: s.indicators.macd_histogram > 0 ? 'bullish' : 'bearish' } : undefined,
          ema: s.indicators.ema_trend ? { trend: s.indicators.ema_trend } : undefined,
          stochastic: s.indicators.stochastic_k ? { k: s.indicators.stochastic_k, signal: s.indicators.stochastic_k < 20 ? 'oversold' : s.indicators.stochastic_k > 80 ? 'overbought' : 'neutral' } : undefined,
        } : undefined,
        source: 'real',
        dataQuality: 'real',
        signalSource: s.signalSource ?? 'algo',
        strategyName: s.strategyName,
        timestamp: s.timestamp,
        status: 'active',
      }));

      // Regime filter: remove signals going against the current market regime
      mapped = filterSignalsByRegime(mapped, regimeMap);

      return NextResponse.json({
        count: mapped.length,
        timestamp: new Date().toISOString(),
        engine: {
          source: 'tradingview-confluence',
          real: mapped.length,
          fallback: 0,
          version: '3.1.0',
          generated_at: liveData.generatedAt,
          regime: dominantRegime,
        },
        filters: { symbol: symbolFilter, timeframe: timeframeFilter, direction: directionFilter, minConfidence, minConfluence },
        signals: mapped,
        syntheticSymbols: [],  // no synthetic — real data from Python engine
      }, {
        headers: { 'Cache-Control': cacheControl },
      });
    }

    // === FALLBACK: Serve from async worker cache instead of generating synchronously ===
    const { getSignalsCached } = await import('../../../lib/signal-worker');
    const { signals: cachedSignals, syntheticSymbols } = await getSignalsCached({
      symbol: symbolFilter || undefined,
      timeframe: timeframeFilter || undefined,
      direction: directionFilter || undefined,
      minConfidence,
    });

    // Side effects (recording, alerts, social queue) still run in the
    // background via getTrackedSignalsForRequest so we don't lose catch-up
    // behavior when the worker cache is serving the response.
    getTrackedSignalsForRequest(request, {
      symbol: symbolFilter || undefined,
      timeframe: timeframeFilter || undefined,
      direction: directionFilter || undefined,
      minConfidence,
    }).catch(() => {});

    // Regime filter: remove signals going against the current market regime
    const signals = filterSignalsByRegime(cachedSignals, regimeMap);

    return NextResponse.json({
      count: signals.length,
      timestamp: new Date().toISOString(),
      engine: {
        real: signals.filter(s => s.source === 'real').length,
        fallback: signals.filter(s => s.source === 'fallback').length,
        version: '2.1.0',
        note: liveData?.isStale ? 'TA engine fallback (live signals file is stale)' : 'TA engine fallback (live signals file not present — expected on Railway, written only by local Python scanner)',
        regime: dominantRegime,
      },
      filters: { symbol: symbolFilter, timeframe: timeframeFilter, direction: directionFilter, minConfidence },
      signals,
      syntheticSymbols,
    }, {
      headers: { 'Cache-Control': cacheControl },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { readLiveSignals } from '../../../lib/signals-live';
import { fetchRegimeMap, filterSignalsByRegime, getDominantRegime } from '../../../lib/regime-filter';

// Re-export types for consumers that imported from here
export type { TradingSignal, IndicatorSummary } from '../../lib/signals';

export async function GET(request: NextRequest) {
  try {
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
    const regimeMap = await fetchRegimeMap();
    const dominantRegime = getDominantRegime(regimeMap);

    // === PRIMARY: Read from PostgreSQL (falls back to signals-live.json) ===
    const liveData = await readLiveSignals();

    if (liveData && !liveData.isStale && liveData.signals.length > 0) {
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
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    }

    // === FALLBACK: Use existing TA engine if signals-live.json is missing/stale/empty ===
    const { signals: rawSignals, syntheticSymbols } = await getTrackedSignalsForRequest(request, {
      symbol: symbolFilter || undefined,
      timeframe: timeframeFilter || undefined,
      direction: directionFilter || undefined,
      minConfidence,
    });

    // Regime filter: remove signals going against the current market regime
    const signals = filterSignalsByRegime(rawSignals, regimeMap);

    return NextResponse.json({
      count: signals.length,
      timestamp: new Date().toISOString(),
      engine: {
        real: signals.filter(s => s.source === 'real').length,
        fallback: signals.filter(s => s.source === 'fallback').length,
        version: '2.1.0',
        note: liveData?.isStale ? 'signals-live.json stale, using fallback engine' : 'signals-live.json not found or empty',
        regime: dominantRegime,
      },
      filters: { symbol: symbolFilter, timeframe: timeframeFilter, direction: directionFilter, minConfidence },
      signals,
      syntheticSymbols,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

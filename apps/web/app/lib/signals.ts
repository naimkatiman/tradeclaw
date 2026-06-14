// Shared signal generation logic — used by both API route and server-side pre-rendering
// Now powered by real technical analysis from OHLCV data

import { getMultiOHLCV } from './ohlcv';
import { calculateAllIndicators } from './ta-engine';
import {
  generateSignalsFromTA,
  generateMultiTFSignal,
  type SignalMode,
  type StrategyProfileId,
} from './signal-generator';

// Signal types — shared from @tradeclaw/signals
import type { TradingSignal, IndicatorSummary } from '@tradeclaw/signals';
import { generateSignalId, clamp } from '@tradeclaw/signals';
export type { TradingSignal, IndicatorSummary } from '@tradeclaw/signals';
export { generateSignalId, clamp, getStrategyName } from '@tradeclaw/signals';

// Symbol configs live in symbol-config.ts (client-safe, no server imports).
// Re-export here for backward compatibility with existing server-side consumers.
export { SYMBOLS, TIMEFRAMES } from './symbol-config';
import { SYMBOLS } from './symbol-config';
import { redis, isRedisAvailable, ensureRedis, redisKey } from '../../lib/redis';

// generateSignalId and clamp are now imported from @tradeclaw/signals

// ─── Live Price Fetching ─────────────────────────────────────

async function fetchStooq(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${symbol.toLowerCase()}&f=c&h&e=csv`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const val = parseFloat(lines[1].trim());
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

export async function getLivePrices(): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  const [cryptoResult, forexResult, xauResult, xagResult] = await Promise.allSettled([
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,dogecoin,binancecoin&vs_currencies=usd', {
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.json() as Promise<Record<string, {usd: number}>> : null),
    fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.json() as Promise<{rates: Record<string, number>}> : null),
    fetchStooq('XAUUSD'),
    fetchStooq('XAGUSD'),
  ]);

  if (cryptoResult.status === 'fulfilled' && cryptoResult.value) {
    const data = cryptoResult.value;
    if (data.bitcoin?.usd) map.set('BTCUSD', data.bitcoin.usd);
    if (data.ethereum?.usd) map.set('ETHUSD', data.ethereum.usd);
    if (data.ripple?.usd) map.set('XRPUSD', data.ripple.usd);
    if (data.solana?.usd) map.set('SOLUSD', data.solana.usd);
    if (data.dogecoin?.usd) map.set('DOGEUSD', data.dogecoin.usd);
    if (data['binancecoin']?.usd) map.set('BNBUSD', data['binancecoin'].usd);
  }

  if (forexResult.status === 'fulfilled' && forexResult.value) {
    const r = forexResult.value.rates || {};
    if (r.EUR) map.set('EURUSD', +(1 / r.EUR).toFixed(5));
    if (r.GBP) map.set('GBPUSD', +(1 / r.GBP).toFixed(5));
    if (r.JPY) map.set('USDJPY', +r.JPY.toFixed(3));
    if (r.AUD) map.set('AUDUSD', +(1 / r.AUD).toFixed(5));
    if (r.CAD) map.set('USDCAD', +r.CAD.toFixed(5));
    if (r.NZD) map.set('NZDUSD', +(1 / r.NZD).toFixed(5));
    if (r.CHF) map.set('USDCHF', +r.CHF.toFixed(5));
  }

  if (xauResult.status === 'fulfilled' && xauResult.value) map.set('XAUUSD', xauResult.value);
  if (xagResult.status === 'fulfilled' && xagResult.value) map.set('XAGUSD', xagResult.value);

  return map;
}

// ─── Main Signal Generation (Real TA Engine) ─────────────────

/**
 * Generate signals using real technical analysis.
 * Skips symbols with insufficient data — never produces synthetic signals.
 */
async function generateRealSignals(
  symbols: typeof SYMBOLS,
  timeframe: string,
  profileId: StrategyProfileId = 'classic',
): Promise<{ signals: TradingSignal[]; syntheticSymbols: string[] }> {
  const symbolNames = symbols.map(s => s.symbol);

  // Fetch OHLCV data for all symbols in parallel
  const ohlcvData = await getMultiOHLCV(symbolNames, timeframe);

  const signals: TradingSignal[] = [];
  const syntheticSymbols: string[] = [];

  for (const sym of symbols) {
    const data = ohlcvData.get(sym.symbol);

    if (!data || data.candles.length < 100) {
      // Not enough data — skip this symbol entirely
      continue;
    }

    if (data.source === 'synthetic') {
      syntheticSymbols.push(sym.symbol);
    }

    // Calculate indicators and generate signals with source transparency
    const indicators = calculateAllIndicators(data.candles);
    const signalSource = data.source === 'synthetic' ? 'synthetic' : 'real';
    const signalTimestamp = data.candles[data.candles.length - 1]?.timestamp ?? Date.now();
    const realSignals = generateSignalsFromTA(
      sym.symbol,
      indicators,
      timeframe,
      signalSource,
      signalTimestamp,
      profileId,
    );

    for (const sig of realSignals) {
      sig.source = signalSource === 'synthetic' ? 'fallback' : 'real';
      // dataQuality is already set by generateSignalsFromTA based on actual data source
    }

    signals.push(...realSignals);
  }
  return { signals, syntheticSymbols };
}

/**
 * Main signal generation function — used by both API route and server components.
 * Uses real TA engine only. Returns empty if no data available.
 */
const SIGNALS_CACHE_KEY = redisKey('signals:latest');
const SIGNALS_CACHE_TTL_MS = 6 * 60 * 1000;

interface CachedSignalsPayload {
  signals: TradingSignal[];
  syntheticSymbols: string[];
  profileId: string;
  generatedAt: number;
}

async function readSignalsCache(): Promise<CachedSignalsPayload | null> {
  try {
    await ensureRedis();
    if (!isRedisAvailable() || !redis) return null;
    const raw = await redis.get(SIGNALS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSignalsPayload;
    const age = Date.now() - (parsed.generatedAt ?? 0);
    if (age > SIGNALS_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function applySignalFilters(
  signals: TradingSignal[],
  symbolFilter?: string,
  timeframeFilter?: string,
  directionFilter?: string,
  minConfidence = 0,
): TradingSignal[] {
  let filtered = signals;
  if (symbolFilter) {
    const upper = symbolFilter.toUpperCase();
    filtered = filtered.filter((s) => s.symbol === upper);
  }
  if (timeframeFilter) {
    const upper = timeframeFilter.toUpperCase();
    filtered = filtered.filter((s) => s.timeframe === upper);
  }
  if (directionFilter) {
    const upper = directionFilter.toUpperCase();
    filtered = filtered.filter((s) => s.direction === upper);
  }
  if (minConfidence > 0) {
    filtered = filtered.filter((s) => s.confidence >= minConfidence);
  }
  filtered.sort((a, b) => b.confidence - a.confidence);
  return filtered;
}

export async function getSignals(
  params: {
    symbol?: string;
    timeframe?: string;
    direction?: string;
    minConfidence?: number;
    profileId?: StrategyProfileId;
  },
  options?: { skipCache?: boolean },
): Promise<{ signals: TradingSignal[]; syntheticSymbols: string[] }> {
  const {
    symbol: symbolFilter,
    timeframe: timeframeFilter,
    direction: directionFilter,
    minConfidence = 0,
    profileId = 'classic',
  } = params;
  const { skipCache } = options ?? {};

  // Try Redis cache first (skip when explicitly generating fresh signals)
  if (!skipCache) {
    try {
      const cached = await readSignalsCache();
      if (cached && cached.profileId === profileId) {
        const signals = applySignalFilters(
          cached.signals,
          symbolFilter,
          timeframeFilter,
          directionFilter,
          minConfidence,
        );
        return { signals, syntheticSymbols: cached.syntheticSymbols };
      }
    } catch {
      // Cache miss or error — fall through to generation
    }
  }

  let symbols = SYMBOLS;
  if (symbolFilter) {
    const upper = symbolFilter.toUpperCase();
    symbols = SYMBOLS.filter((s) => s.symbol === upper);
    if (symbols.length === 0) {
      return { signals: [], syntheticSymbols: [] };
    }
  }

  // Determine timeframes to analyze
  const timeframesToCheck = timeframeFilter
    ? [timeframeFilter.toUpperCase()]
    : ['M15', 'H1', 'H4', 'D1']; // Default: check all timeframes

  let allSignals: TradingSignal[] = [];
  const allSyntheticSymbols = new Set<string>();

  try {
    const settled = await Promise.allSettled(
      timeframesToCheck.map(async (tf) => {
        const result = await generateRealSignals(symbols, tf, profileId);
        return { timeframe: tf, ...result };
      }),
    );

    for (const result of settled) {
      if (result.status !== 'fulfilled') continue;
      allSignals.push(...result.value.signals);
      for (const s of result.value.syntheticSymbols) allSyntheticSymbols.add(s);
    }
  } catch {
    // TA engine crashed — return empty rather than misleading random signals
  }

  // MTF re-boost. The per-TF engine in signal-generator.ts caps confidence at
  // 70 whenever the score-based confidence crosses 75, with the comment
  // "caller can re-boost via MTF". This is that caller. One MTF call per
  // (symbol, mode) in parallel, applied to every signal whose direction
  // matches the dominant TF. Without this, confidence>=85 is structurally
  // unreachable and the equity card's premium band is permanently empty.
  if (allSignals.length > 0) {
    try {
      const tfMode = (tf: string): SignalMode =>
        tf === 'M5' || tf === 'M15' ? 'scalp' : 'swing';
      const mtfKeys = new Set(allSignals.map(s => `${s.symbol}|${tfMode(s.timeframe)}`));
      const mtfPairs = await Promise.all(
        [...mtfKeys].map(async key => {
          const [symbol, mode] = key.split('|') as [string, SignalMode];
          const mtf = await generateMultiTFSignal(symbol, mode);
          return [key, mtf] as const;
        }),
      );
      const mtfByKey = new Map(mtfPairs);
      for (const sig of allSignals) {
        const mtf = mtfByKey.get(`${sig.symbol}|${tfMode(sig.timeframe)}`);
        if (!mtf) continue;
        // Capture the pre-boost confidence + MTF survey BEFORE mutating, so the
        // calibration features (Phase 4 D4) record what shaped the published
        // confidence. mtfAgreement is the dominant-direction agreement count;
        // appliedBonus is the bonus actually added (0 when the dominant TF is
        // neutral or opposite-without-conflict, where confidence is unchanged).
        const preBoost = sig.confidence;
        let appliedBonus = 0;
        if (mtf.dominantDirection === sig.direction) {
          // 4/4 aligned → +15, 3/4 → +10, 2/4 → +5. Clamp at 95 to leave 100 as
          // unattainable, matching scaleConfidence's own cap.
          appliedBonus = mtf.confluenceBonus;
          sig.confidence = Math.min(95, sig.confidence + mtf.confluenceBonus);
        } else if (mtf.isConflicted) {
          // Mixed TFs (1 vs 2) → -20. Push below PUBLISHED_SIGNAL_MIN_CONFIDENCE
          // and the downstream cron filter drops the signal. Clamp at 0.
          appliedBonus = mtf.confluenceBonus;
          sig.confidence = Math.max(0, sig.confidence + mtf.confluenceBonus);
        }
        // Dominant direction NEUTRAL or opposite-without-conflict → unchanged
        // (appliedBonus stays 0).
        sig.preBoostConfidence = preBoost;
        sig.mtfAgreement = mtf.agreementCount;
        sig.confluenceBonus = appliedBonus;
      }
    } catch {
      // MTF fetch failed — leave signals at engine-emitted confidence.
    }
  }

  // Apply filters
  if (timeframeFilter) {
    const upper = timeframeFilter.toUpperCase();
    allSignals = allSignals.filter(s => s.timeframe === upper);
  }
  if (directionFilter) {
    const upper = directionFilter.toUpperCase();
    allSignals = allSignals.filter(s => s.direction === upper);
  }
  if (minConfidence > 0) {
    allSignals = allSignals.filter(s => s.confidence >= minConfidence);
  }

  // Sort by confidence descending
  allSignals.sort((a, b) => b.confidence - a.confidence);

  return { signals: allSignals, syntheticSymbols: [...allSyntheticSymbols] };
}

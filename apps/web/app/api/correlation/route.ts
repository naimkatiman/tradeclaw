import { NextResponse } from 'next/server';
import { getMultiOHLCV } from '../../lib/ohlcv';

const REQUESTED_ASSETS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD',
];
const MIN_COMMON_RETURNS = 20;

interface CorrelationResponse {
  available: true;
  assets: string[];
  matrix: number[][];
  sampleSize: number;
  method: 'pearson-log-returns-common-hourly-timestamps';
  sources: Record<string, string>;
  latestCandleAt: Record<string, string>;
  computedAt: string;
  updatedAt: string;
}

let cached: { data: CorrelationResponse; expires: number } | null = null;

function pearson(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < MIN_COMMON_RETURNS) return null;
  const meanX = x.reduce((sum, value) => sum + value, 0) / x.length;
  const meanY = y.reduce((sum, value) => sum + value, 0) / y.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }
  const denominator = Math.sqrt(varianceX * varianceY);
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return Math.max(-1, Math.min(1, covariance / denominator));
}

function toLogReturns(
  candles: Array<{ timestamp: number; close: number }>,
): Map<number, number> {
  const sorted = candles
    .filter((candle) => Number.isFinite(candle.timestamp) && Number.isFinite(candle.close) && candle.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  const returns = new Map<number, number>();
  for (let i = 1; i < sorted.length; i++) {
    const value = Math.log(sorted[i].close / sorted[i - 1].close);
    if (Number.isFinite(value)) returns.set(sorted[i].timestamp, value);
  }
  return returns;
}

export async function GET() {
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  }

  try {
    const ohlcvMap = await getMultiOHLCV(REQUESTED_ASSETS, 'H1');
    const observed = REQUESTED_ASSETS.flatMap((asset) => {
      const entry = ohlcvMap.get(asset);
      if (!entry || entry.source === 'synthetic' || entry.candles.length < MIN_COMMON_RETURNS + 1) return [];
      const returns = toLogReturns(entry.candles);
      if (returns.size < MIN_COMMON_RETURNS) return [];
      return [{ asset, source: entry.source, candles: entry.candles, returns }];
    });

    if (observed.length < 2) {
      return NextResponse.json(
        {
          available: false,
          assets: [],
          matrix: [],
          reason: 'insufficient-observed-assets',
          note: 'No synthetic candles or zero-filled correlations were substituted.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    let commonTimestamps = [...observed[0].returns.keys()];
    for (const entry of observed.slice(1)) {
      commonTimestamps = commonTimestamps.filter((timestamp) => entry.returns.has(timestamp));
    }
    commonTimestamps.sort((a, b) => a - b);
    commonTimestamps = commonTimestamps.slice(-100);

    if (commonTimestamps.length < MIN_COMMON_RETURNS) {
      return NextResponse.json(
        {
          available: false,
          assets: observed.map((entry) => entry.asset),
          matrix: [],
          reason: 'insufficient-common-timestamps',
          commonTimestampCount: commonTimestamps.length,
          note: 'Correlation requires aligned observed hourly returns; arrays were not matched by position.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const assets = observed.map((entry) => entry.asset);
    const aligned = observed.map((entry) => commonTimestamps.map((timestamp) => entry.returns.get(timestamp)!));
    const matrix = aligned.map((row, i) => aligned.map((column, j) => {
      if (i === j) return 1;
      const value = pearson(row, column);
      if (value === null) throw new Error('insufficient-return-variance');
      return +value.toFixed(6);
    }));
    const computedAt = new Date().toISOString();
    const sources = Object.fromEntries(observed.map((entry) => [entry.asset, entry.source]));
    const latestCandleAt = Object.fromEntries(observed.map((entry) => [
      entry.asset,
      new Date(entry.candles.at(-1)!.timestamp).toISOString(),
    ]));
    const data: CorrelationResponse = {
      available: true,
      assets,
      matrix,
      sampleSize: commonTimestamps.length,
      method: 'pearson-log-returns-common-hourly-timestamps',
      sources,
      latestCandleAt,
      computedAt,
      updatedAt: computedAt,
    };

    cached = { data, expires: Date.now() + 5 * 60 * 1000 };
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json(
      {
        available: false,
        assets: [],
        matrix: [],
        reason: 'correlation-source-unavailable',
        note: 'No synthetic or zero-filled fallback matrix was returned.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

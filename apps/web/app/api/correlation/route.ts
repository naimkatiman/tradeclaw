import { NextResponse } from 'next/server';
import { getMultiOHLCV } from '../../lib/ohlcv';

const ASSETS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD',
];

interface CorrelationResponse {
  assets: string[];
  matrix: number[][];
  updatedAt: string;
}

// 5-minute server-side cache
let cached: { data: CorrelationResponse; expires: number } | null = null;

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

export async function GET() {
  if (cached && Date.now() < cached.expires) {
    return NextResponse.json(cached.data);
  }

  try {
    const ohlcvMap = await getMultiOHLCV(ASSETS, 'H1');

    // Extract last 100 close prices per asset
    const closes: Record<string, number[]> = {};
    for (const asset of ASSETS) {
      const entry = ohlcvMap.get(asset);
      if (entry && entry.candles.length > 0) {
        const last100 = entry.candles.slice(-100).map(c => c.close);
        closes[asset] = last100;
      } else {
        closes[asset] = [];
      }
    }

    // Build NxN correlation matrix
    const n = ASSETS.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (j > i) {
          const r = pearson(closes[ASSETS[i]], closes[ASSETS[j]]);
          matrix[i][j] = r;
          matrix[j][i] = r;
        }
      }
    }

    const data: CorrelationResponse = {
      assets: ASSETS,
      matrix,
      updatedAt: new Date().toISOString(),
    };

    cached = { data, expires: Date.now() + 5 * 60 * 1000 };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to compute correlation matrix' }, { status: 500 });
  }
}

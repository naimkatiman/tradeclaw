import { NextRequest, NextResponse } from 'next/server';
import { getOHLCV, type OHLCV } from '../../lib/ohlcv';

// ATR-based stop loss + Fibonacci extension TPs
// Fibonacci extension levels: 1.618, 2.618, 4.236

interface TpSlRequest {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  atrPeriod?: number;
  riskPercent?: number; // account risk % per trade
  accountSize?: number;
  lotSize?: number;
}

interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: 'strong' | 'medium' | 'weak';
}

interface TpSlResult {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  atr: number;
  stopLoss: number;
  stopLossDistance: number;
  takeProfits: {
    tp1: number; // 1.618 fib
    tp2: number; // 2.618 fib
    tp3: number; // 4.236 fib
  };
  riskRewardRatios: {
    tp1: number;
    tp2: number;
    tp3: number;
  };
  positionSizing: {
    accountSize: number;
    riskPercent: number;
    riskAmount: number;
    recommendedLots: null;
    pipsAtRisk: number;
    reason: string;
  };
  snapToSR: boolean;
  srLevels: SupportResistanceLevel[];
  dataSource: { provider: string; candleCount: number };
}

const SYMBOL_CONFIG: Record<string, { pipValue: number }> = {
  XAUUSD: { pipValue: 0.01 }, XAGUSD: { pipValue: 0.001 },
  BTCUSD: { pipValue: 1 }, ETHUSD: { pipValue: 0.01 }, XRPUSD: { pipValue: 0.0001 },
  EURUSD: { pipValue: 0.0001 }, GBPUSD: { pipValue: 0.0001 }, USDJPY: { pipValue: 0.01 },
  AUDUSD: { pipValue: 0.0001 }, USDCAD: { pipValue: 0.0001 },
  NZDUSD: { pipValue: 0.0001 }, USDCHF: { pipValue: 0.0001 },
};

/**
 * Calculate ATR (Average True Range) from OHLCV candles.
 * True Range = max(high - low, |high - prevClose|, |low - prevClose|)
 * ATR = simple average of true ranges over `period` periods.
 */
function calculateATRFromCandles(candles: OHLCV[], period: number = 14): number | null {
  if (candles.length < period + 1) return null;

  // Use the most recent candles
  const recent = candles.slice(-(period + 1));
  let sum = 0;

  for (let i = 1; i < recent.length; i++) {
    const high = recent[i].high;
    const low = recent[i].low;
    const prevClose = recent[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    );
    sum += tr;
  }

  const atr = sum / period;
  return atr > 0 ? atr : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase() || 'XAUUSD';
  const direction = (searchParams.get('direction')?.toUpperCase() || 'BUY') as 'BUY' | 'SELL';
  const entryParam = searchParams.get('entry');
  const accountSize = parseFloat(searchParams.get('accountSize') || '10000');
  const riskPercent = parseFloat(searchParams.get('riskPercent') || '1');

  const config = SYMBOL_CONFIG[symbol];
  if (!config) {
    return NextResponse.json({ error: `Unknown symbol: ${symbol}` }, { status: 400 });
  }

  const entry = entryParam ? parseFloat(entryParam) : Number.NaN;
  if (!Number.isFinite(entry) || entry <= 0) {
    return NextResponse.json({ error: 'A positive observed entry price is required.' }, { status: 400 });
  }
  if (direction !== 'BUY' && direction !== 'SELL') {
    return NextResponse.json({ error: 'direction must be BUY or SELL' }, { status: 400 });
  }
  if (!Number.isFinite(accountSize) || accountSize <= 0 || !Number.isFinite(riskPercent) || riskPercent <= 0) {
    return NextResponse.json({ error: 'accountSize and riskPercent must be positive numbers' }, { status: 400 });
  }

  let atr: number;
  let dataSource: TpSlResult['dataSource'];
  try {
    const { candles, source } = await getOHLCV(symbol, 'H1');
    if (source === 'synthetic') {
      return NextResponse.json({ error: 'Provider-backed OHLCV is unavailable; no estimated ATR was substituted.' }, { status: 503 });
    }
    const realATR = calculateATRFromCandles(candles);
    if (realATR === null) {
      return NextResponse.json({ error: 'Insufficient provider-backed candles for ATR calculation.' }, { status: 503 });
    }
    atr = realATR;
    dataSource = { provider: source, candleCount: candles.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.warn(`[tpsl] Failed to fetch OHLCV for ${symbol}: ${message}`);
    return NextResponse.json({ error: 'Provider-backed OHLCV is unavailable; no estimated ATR was substituted.' }, { status: 503 });
  }

  // ATR-based SL: 1.5x ATR
  const slDistance = atr * 1.5;

  // Calculate TP levels using Fibonacci extensions
  const tp1Distance = slDistance * 1.618;
  const tp2Distance = slDistance * 2.618;
  const tp3Distance = slDistance * 4.236;

  const stopLoss = direction === 'BUY' ? entry - slDistance : entry + slDistance;
  const tp1 = direction === 'BUY' ? entry + tp1Distance : entry - tp1Distance;
  const tp2 = direction === 'BUY' ? entry + tp2Distance : entry - tp2Distance;
  const tp3 = direction === 'BUY' ? entry + tp3Distance : entry - tp3Distance;

  const actualSlDistance = Math.abs(entry - stopLoss);
  const pipsAtRisk = actualSlDistance / config.pipValue;

  // Position sizing
  const riskAmount = accountSize * (riskPercent / 100);

  const result: TpSlResult = {
    symbol,
    direction,
    entry: +entry.toFixed(5),
    atr: +atr.toFixed(5),
    stopLoss: +stopLoss.toFixed(5),
    stopLossDistance: +actualSlDistance.toFixed(5),
    takeProfits: {
      tp1: +tp1.toFixed(5),
      tp2: +tp2.toFixed(5),
      tp3: +tp3.toFixed(5),
    },
    riskRewardRatios: {
      tp1: +((Math.abs(tp1 - entry)) / actualSlDistance).toFixed(2),
      tp2: +((Math.abs(tp2 - entry)) / actualSlDistance).toFixed(2),
      tp3: +((Math.abs(tp3 - entry)) / actualSlDistance).toFixed(2),
    },
    positionSizing: {
      accountSize,
      riskPercent,
      riskAmount: +riskAmount.toFixed(2),
      recommendedLots: null,
      pipsAtRisk: +pipsAtRisk.toFixed(1),
      reason: 'Lot sizing is unavailable without broker contract specifications and account currency conversion.',
    },
    snapToSR: false,
    srLevels: [],
    dataSource,
  };

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body: TpSlRequest = await request.json();
    const { symbol, direction, entry, accountSize = 10000, riskPercent = 1 } = body;

    // Redirect to GET handler logic
    const url = new URL(request.url);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('direction', direction);
    url.searchParams.set('entry', String(entry));
    url.searchParams.set('accountSize', String(accountSize));
    url.searchParams.set('riskPercent', String(riskPercent));

    return GET(new NextRequest(url));
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

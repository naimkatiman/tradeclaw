import { NextRequest, NextResponse } from 'next/server';

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
    recommendedLots: number;
    pipsAtRisk: number;
  };
  snapToSR: boolean;
  srLevels: SupportResistanceLevel[];
}

// Symbol pip values and ATR estimates
const SYMBOL_CONFIG: Record<string, { pipValue: number; atrEstimate: number; basePrice: number }> = {
  XAUUSD: { pipValue: 0.01, atrEstimate: 12.5, basePrice: 2180 },
  XAGUSD: { pipValue: 0.001, atrEstimate: 0.25, basePrice: 24.80 },
  BTCUSD: { pipValue: 1, atrEstimate: 1800, basePrice: 87500 },
  ETHUSD: { pipValue: 0.01, atrEstimate: 90, basePrice: 3400 },
  XRPUSD: { pipValue: 0.0001, atrEstimate: 0.025, basePrice: 0.62 },
  EURUSD: { pipValue: 0.0001, atrEstimate: 0.0060, basePrice: 1.083 },
  GBPUSD: { pipValue: 0.0001, atrEstimate: 0.0080, basePrice: 1.264 },
  USDJPY: { pipValue: 0.01, atrEstimate: 0.65, basePrice: 151.2 },
  AUDUSD: { pipValue: 0.0001, atrEstimate: 0.0045, basePrice: 0.654 },
  USDCAD: { pipValue: 0.0001, atrEstimate: 0.0050, basePrice: 1.358 },
  NZDUSD: { pipValue: 0.0001, atrEstimate: 0.0040, basePrice: 0.608 },
  USDCHF: { pipValue: 0.0001, atrEstimate: 0.0045, basePrice: 0.884 },
};

function generateSRLevels(entry: number, atr: number): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = [];
  const offsets = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

  for (const offset of offsets) {
    // Round to nearest ATR grid
    const supportPrice = Math.round((entry - atr * offset) / (atr * 0.5)) * (atr * 0.5);
    const resistancePrice = Math.round((entry + atr * offset) / (atr * 0.5)) * (atr * 0.5);

    levels.push({
      price: +supportPrice.toFixed(5),
      type: 'support',
      strength: offset <= 1 ? 'strong' : offset <= 2 ? 'medium' : 'weak',
    });
    levels.push({
      price: +resistancePrice.toFixed(5),
      type: 'resistance',
      strength: offset <= 1 ? 'strong' : offset <= 2 ? 'medium' : 'weak',
    });
  }

  return levels.sort((a, b) => a.price - b.price);
}

function snapToNearestSR(price: number, srLevels: SupportResistanceLevel[], tolerance: number): number {
  let nearest = price;
  let minDist = Infinity;

  for (const level of srLevels) {
    const dist = Math.abs(level.price - price);
    if (dist < minDist && dist < tolerance) {
      minDist = dist;
      nearest = level.price;
    }
  }

  return nearest;
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

  const entry = entryParam ? parseFloat(entryParam) : config.basePrice;

  // ATR-based SL: 1.5x ATR
  const atr = config.atrEstimate * (0.85 + Math.random() * 0.3);
  const slDistance = atr * 1.5;

  const srLevels = generateSRLevels(entry, atr);
  const snapTolerance = atr * 0.3;

  // Calculate TP levels using Fibonacci extensions
  const tp1Distance = slDistance * 1.618;
  const tp2Distance = slDistance * 2.618;
  const tp3Distance = slDistance * 4.236;

  let stopLoss = direction === 'BUY' ? entry - slDistance : entry + slDistance;
  let tp1 = direction === 'BUY' ? entry + tp1Distance : entry - tp1Distance;
  let tp2 = direction === 'BUY' ? entry + tp2Distance : entry - tp2Distance;
  let tp3 = direction === 'BUY' ? entry + tp3Distance : entry - tp3Distance;

  // Snap to S/R levels
  stopLoss = snapToNearestSR(stopLoss, srLevels, snapTolerance);
  tp1 = snapToNearestSR(tp1, srLevels, snapTolerance);
  tp2 = snapToNearestSR(tp2, srLevels, snapTolerance);
  tp3 = snapToNearestSR(tp3, srLevels, snapTolerance);

  const actualSlDistance = Math.abs(entry - stopLoss);
  const pipsAtRisk = actualSlDistance / config.pipValue;

  // Position sizing
  const riskAmount = accountSize * (riskPercent / 100);
  const pipValuePerLot = 10; // Standard lot pip value (approximate, USD accounts)
  const recommendedLots = +(riskAmount / (pipsAtRisk * pipValuePerLot)).toFixed(2);

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
      recommendedLots: Math.max(0.01, recommendedLots),
      pipsAtRisk: +pipsAtRisk.toFixed(1),
    },
    snapToSR: true,
    srLevels,
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

import { NextRequest, NextResponse } from 'next/server';

// Signal types
export interface TradingSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number; // 0-100
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  indicators: IndicatorSummary;
  timeframe: string;
  timestamp: string;
  status: 'active' | 'hit_tp1' | 'hit_tp2' | 'hit_tp3' | 'stopped' | 'expired';
}

interface IndicatorSummary {
  rsi: { value: number; signal: 'oversold' | 'neutral' | 'overbought' };
  macd: { histogram: number; signal: 'bullish' | 'bearish' | 'neutral' };
  ema: { trend: 'up' | 'down' | 'sideways'; ema20: number; ema50: number; ema200: number };
  bollingerBands: { position: 'upper' | 'middle' | 'lower'; bandwidth: number };
  stochastic: { k: number; d: number; signal: 'oversold' | 'neutral' | 'overbought' };
  support: number[];
  resistance: number[];
}

// Symbol configurations
const SYMBOLS = [
  { symbol: 'XAUUSD', name: 'Gold', pip: 0.01, basePrice: 2180, volatility: 15 },
  { symbol: 'XAGUSD', name: 'Silver', pip: 0.001, basePrice: 24.80, volatility: 0.3 },
  { symbol: 'BTCUSD', name: 'Bitcoin', pip: 0.01, basePrice: 87500, volatility: 2000 },
  { symbol: 'ETHUSD', name: 'Ethereum', pip: 0.01, basePrice: 3400, volatility: 100 },
  { symbol: 'XRPUSD', name: 'XRP', pip: 0.0001, basePrice: 0.62, volatility: 0.03 },
  { symbol: 'EURUSD', name: 'EUR/USD', pip: 0.0001, basePrice: 1.0830, volatility: 0.005 },
  { symbol: 'GBPUSD', name: 'GBP/USD', pip: 0.0001, basePrice: 1.2640, volatility: 0.006 },
  { symbol: 'USDJPY', name: 'USD/JPY', pip: 0.01, basePrice: 151.20, volatility: 0.8 },
  { symbol: 'AUDUSD', name: 'AUD/USD', pip: 0.0001, basePrice: 0.6540, volatility: 0.004 },
  { symbol: 'USDCAD', name: 'USD/CAD', pip: 0.0001, basePrice: 1.3580, volatility: 0.005 },
  { symbol: 'NZDUSD', name: 'NZD/USD', pip: 0.0001, basePrice: 0.6080, volatility: 0.004 },
  { symbol: 'USDCHF', name: 'USD/CHF', pip: 0.0001, basePrice: 0.8840, volatility: 0.004 },
];

const TIMEFRAMES = ['M5', 'M15', 'H1', 'H4', 'D1'];

function generateSignalId(): string {
  return `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function generateIndicators(price: number, direction: 'BUY' | 'SELL', volatility: number): IndicatorSummary {
  const rsiValue = direction === 'BUY'
    ? clamp(25 + Math.random() * 20, 15, 45)
    : clamp(60 + Math.random() * 25, 55, 85);

  const macdHist = direction === 'BUY'
    ? +(Math.random() * 0.5 + 0.1).toFixed(4)
    : +(-Math.random() * 0.5 - 0.1).toFixed(4);

  const ema20 = direction === 'BUY' ? price * (1 - Math.random() * 0.005) : price * (1 + Math.random() * 0.005);
  const ema50 = direction === 'BUY' ? price * (1 - Math.random() * 0.01) : price * (1 + Math.random() * 0.01);
  const ema200 = direction === 'BUY' ? price * (1 - Math.random() * 0.02) : price * (1 + Math.random() * 0.02);

  const stochK = direction === 'BUY'
    ? clamp(15 + Math.random() * 15, 5, 30)
    : clamp(70 + Math.random() * 20, 70, 95);

  const support1 = price - volatility * (1 + Math.random());
  const support2 = price - volatility * (2 + Math.random());
  const resistance1 = price + volatility * (1 + Math.random());
  const resistance2 = price + volatility * (2 + Math.random());

  return {
    rsi: {
      value: +rsiValue.toFixed(2),
      signal: rsiValue < 30 ? 'oversold' : rsiValue > 70 ? 'overbought' : 'neutral',
    },
    macd: {
      histogram: macdHist,
      signal: macdHist > 0 ? 'bullish' : macdHist < 0 ? 'bearish' : 'neutral',
    },
    ema: {
      trend: direction === 'BUY' ? 'up' : 'down',
      ema20: +ema20.toFixed(5),
      ema50: +ema50.toFixed(5),
      ema200: +ema200.toFixed(5),
    },
    bollingerBands: {
      position: direction === 'BUY' ? 'lower' : 'upper',
      bandwidth: +(volatility * 2 / price * 100).toFixed(4),
    },
    stochastic: {
      k: +stochK.toFixed(2),
      d: +(stochK - 2 + Math.random() * 4).toFixed(2),
      signal: stochK < 20 ? 'oversold' : stochK > 80 ? 'overbought' : 'neutral',
    },
    support: [+support1.toFixed(5), +support2.toFixed(5)],
    resistance: [+resistance1.toFixed(5), +resistance2.toFixed(5)],
  };
}

function generateSignal(symbolConfig: typeof SYMBOLS[0]): TradingSignal {
  const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const priceOffset = (Math.random() - 0.5) * symbolConfig.volatility * 2;
  const currentPrice = symbolConfig.basePrice + priceOffset;
  const riskReward = 1.5 + Math.random() * 1.5; // 1.5:1 to 3:1

  const slDistance = symbolConfig.volatility * (0.3 + Math.random() * 0.4);
  const tp1Distance = slDistance * riskReward;
  const tp2Distance = tp1Distance * 1.618; // Fibonacci extension
  const tp3Distance = tp1Distance * 2.618;

  const entry = +currentPrice.toFixed(5);
  const stopLoss = direction === 'BUY'
    ? +(entry - slDistance).toFixed(5)
    : +(entry + slDistance).toFixed(5);
  const takeProfit1 = direction === 'BUY'
    ? +(entry + tp1Distance).toFixed(5)
    : +(entry - tp1Distance).toFixed(5);
  const takeProfit2 = direction === 'BUY'
    ? +(entry + tp2Distance).toFixed(5)
    : +(entry - tp2Distance).toFixed(5);
  const takeProfit3 = direction === 'BUY'
    ? +(entry + tp3Distance).toFixed(5)
    : +(entry - tp3Distance).toFixed(5);

  const confidence = Math.floor(55 + Math.random() * 40); // 55-95
  const timeframe = TIMEFRAMES[Math.floor(Math.random() * TIMEFRAMES.length)];

  return {
    id: generateSignalId(),
    symbol: symbolConfig.symbol,
    direction,
    confidence,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    indicators: generateIndicators(currentPrice, direction, symbolConfig.volatility),
    timeframe,
    timestamp: new Date().toISOString(),
    status: 'active',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolFilter = searchParams.get('symbol')?.toUpperCase();
  const timeframeFilter = searchParams.get('timeframe')?.toUpperCase();
  const directionFilter = searchParams.get('direction')?.toUpperCase() as 'BUY' | 'SELL' | null;
  const minConfidence = parseInt(searchParams.get('minConfidence') || '0');

  let symbols = SYMBOLS;
  if (symbolFilter) {
    symbols = SYMBOLS.filter(s => s.symbol === symbolFilter);
    if (symbols.length === 0) {
      return NextResponse.json(
        { error: `Unknown symbol: ${symbolFilter}`, available: SYMBOLS.map(s => s.symbol) },
        { status: 400 }
      );
    }
  }

  // Generate 1-3 signals per symbol
  let signals: TradingSignal[] = [];
  for (const sym of symbols) {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      signals.push(generateSignal(sym));
    }
  }

  // Apply filters
  if (timeframeFilter) {
    signals = signals.filter(s => s.timeframe === timeframeFilter);
  }
  if (directionFilter) {
    signals = signals.filter(s => s.direction === directionFilter);
  }
  if (minConfidence > 0) {
    signals = signals.filter(s => s.confidence >= minConfidence);
  }

  // Sort by confidence descending
  signals.sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json({
    count: signals.length,
    timestamp: new Date().toISOString(),
    filters: { symbol: symbolFilter, timeframe: timeframeFilter, direction: directionFilter, minConfidence },
    signals,
  });
}

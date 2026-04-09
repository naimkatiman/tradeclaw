import { NextResponse } from 'next/server';

// ─── Demo Signal Generator ──────────────────────────────────
// Deterministic daily-reset mock signals for demo.tradeclaw.win
// Seed is based on UTC date so signals rotate every 24h but stay
// consistent within the same day for any visitor.

const SYMBOLS = [
  { symbol: 'BTCUSD', name: 'Bitcoin', basePrice: 84250, decimals: 0, atr: 1800 },
  { symbol: 'ETHUSD', name: 'Ethereum', basePrice: 1920, decimals: 0, atr: 80 },
  { symbol: 'XAUUSD', name: 'Gold', basePrice: 3075, decimals: 2, atr: 25 },
  { symbol: 'XAGUSD', name: 'Silver', basePrice: 34.50, decimals: 2, atr: 0.8 },
  { symbol: 'EURUSD', name: 'EUR/USD', basePrice: 1.0835, decimals: 4, atr: 0.006 },
  { symbol: 'GBPUSD', name: 'GBP/USD', basePrice: 1.2935, decimals: 4, atr: 0.007 },
  { symbol: 'USDJPY', name: 'USD/JPY', basePrice: 150.85, decimals: 3, atr: 0.8 },
  { symbol: 'AUDUSD', name: 'AUD/USD', basePrice: 0.6580, decimals: 4, atr: 0.005 },
  { symbol: 'XRPUSD', name: 'XRP', basePrice: 2.15, decimals: 4, atr: 0.08 },
  { symbol: 'SOLUSD', name: 'Solana', basePrice: 125, decimals: 2, atr: 6 },
  { symbol: 'USDCAD', name: 'USD/CAD', basePrice: 1.3620, decimals: 4, atr: 0.006 },
  { symbol: 'NZDUSD', name: 'NZD/USD', basePrice: 0.5985, decimals: 4, atr: 0.004 },
];

const TIMEFRAMES = ['M15', 'H1', 'H4', 'D1'];

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

function generateDemoSignals() {
  const rand = mulberry32(dateSeed());
  const now = new Date().toISOString();

  return SYMBOLS.map((s, idx) => {
    // Deterministic per-symbol randomness
    const r1 = rand();
    const r2 = rand();
    const r3 = rand();
    const r4 = rand();
    const r5 = rand();
    const r6 = rand();

    const direction: 'BUY' | 'SELL' = r1 > 0.5 ? 'BUY' : 'SELL';
    const confidence = Math.round(55 + r2 * 40); // 55–95
    const priceOffset = (r3 - 0.5) * s.atr * 2;
    const entry = +(s.basePrice + priceOffset).toFixed(s.decimals);
    const slDist = +(s.atr * (0.8 + r4 * 0.4)).toFixed(s.decimals);
    const tp1Dist = +(s.atr * (1.0 + r5 * 0.5)).toFixed(s.decimals);
    const tp2Dist = +(tp1Dist * (1.5 + r6 * 0.5)).toFixed(s.decimals);
    const tp3Dist = +(tp2Dist * 1.4).toFixed(s.decimals);

    const sign = direction === 'BUY' ? 1 : -1;

    const rsi = +(30 + r5 * 40).toFixed(1); // 30–70
    const macdHist = +((r6 - 0.5) * s.atr * 0.1).toFixed(s.decimals);
    const tf = TIMEFRAMES[Math.floor(r4 * TIMEFRAMES.length)];

    return {
      id: `demo-${s.symbol.toLowerCase()}-${dateSeed()}-${idx}`,
      symbol: s.symbol,
      name: s.name,
      direction,
      confidence,
      entry,
      stopLoss: +(entry - sign * slDist).toFixed(s.decimals),
      takeProfit1: +(entry + sign * tp1Dist).toFixed(s.decimals),
      takeProfit2: +(entry + sign * tp2Dist).toFixed(s.decimals),
      takeProfit3: +(entry + sign * tp3Dist).toFixed(s.decimals),
      timeframe: tf,
      timestamp: now,
      status: 'active',
      source: 'demo',
      dataQuality: 'synthetic',
      indicators: {
        rsi: { value: rsi, signal: rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral' },
        macd: { histogram: macdHist, signal: macdHist > 0 ? 'bullish' : 'bearish' },
        ema: {
          trend: direction === 'BUY' ? 'up' : 'down',
          ema20: +(entry + (r1 - 0.5) * s.atr * 0.3).toFixed(s.decimals),
          ema50: +(entry + (r2 - 0.5) * s.atr * 0.5).toFixed(s.decimals),
          ema200: +(entry - sign * s.atr * 1.5).toFixed(s.decimals),
        },
        bollingerBands: { position: r3 > 0.6 ? 'upper' : r3 < 0.3 ? 'lower' : 'middle', bandwidth: +(r4 * 0.05).toFixed(3) },
        stochastic: { k: +(20 + r5 * 60).toFixed(1), d: +(20 + r6 * 60).toFixed(1), signal: 'neutral' },
        support: [+(entry - s.atr).toFixed(s.decimals), +(entry - s.atr * 2).toFixed(s.decimals)],
        resistance: [+(entry + s.atr).toFixed(s.decimals), +(entry + s.atr * 2).toFixed(s.decimals)],
      },
    };
  });
}

export async function GET() {
  const signals = generateDemoSignals();
  const seed = dateSeed();

  return NextResponse.json(
    {
      mode: 'demo',
      seed,
      resetsAt: (() => {
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        return tomorrow.toISOString();
      })(),
      count: signals.length,
      timestamp: new Date().toISOString(),
      signals,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

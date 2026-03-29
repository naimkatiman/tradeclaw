// ─── Types ────────────────────────────────────────────────────

export type StrategyId =
  | 'rsi-mean-reversion'
  | 'macd-momentum'
  | 'ema-crossover'
  | 'bollinger-breakout'
  | 'multi-tf-confluence';

export type AssetId = 'BTCUSD' | 'ETHUSD' | 'XAUUSD';

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  indicators: string;
}

export interface Asset {
  id: AssetId;
  name: string;
  symbol: string;
}

export interface BacktestMetrics {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgHoldingHours: number;
  startDate: string;
  endDate: string;
}

export interface MonthlyReturn {
  month: string; // "Jan", "Feb", etc.
  value: number;
}

export interface StrategyResult {
  strategyId: StrategyId;
  assetId: AssetId;
  metrics: BacktestMetrics;
  monthlyReturns: MonthlyReturn[];
}

// ─── Constants ────────────────────────────────────────────────

export const STRATEGIES: Strategy[] = [
  {
    id: 'rsi-mean-reversion',
    name: 'RSI Mean Reversion',
    description: 'Buys oversold dips (RSI < 30) and sells overbought rallies (RSI > 70) with adaptive exits.',
    indicators: 'RSI(14), Bollinger Bands(20,2)',
  },
  {
    id: 'macd-momentum',
    name: 'MACD Momentum',
    description: 'Trend-following entries on MACD crossover confirmed by histogram divergence.',
    indicators: 'MACD(12,26,9), EMA(200)',
  },
  {
    id: 'ema-crossover',
    name: 'EMA Crossover',
    description: 'Classic fast/slow EMA crossover with ATR-based stop losses and trailing exits.',
    indicators: 'EMA(9), EMA(21), ATR(14)',
  },
  {
    id: 'bollinger-breakout',
    name: 'Bollinger Breakout',
    description: 'Captures volatility expansion when price breaks above/below Bollinger Bands.',
    indicators: 'BB(20,2), Volume, RSI(14)',
  },
  {
    id: 'multi-tf-confluence',
    name: 'Multi-TF Confluence',
    description: 'Combines 1H, 4H, and Daily signals for high-conviction entries with multiple confirmations.',
    indicators: 'RSI, MACD, EMA across 3 timeframes',
  },
];

export const ASSETS: Asset[] = [
  { id: 'BTCUSD', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'ETHUSD', name: 'Ethereum', symbol: 'ETH' },
  { id: 'XAUUSD', name: 'Gold', symbol: 'XAU' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Seeded PRNG ──────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashKey(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ─── Seed Data ────────────────────────────────────────────────

interface SeedRow {
  strategyId: StrategyId;
  assetId: AssetId;
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgHoldingHours: number;
}

const SEED_DATA: SeedRow[] = [
  // RSI Mean Reversion
  { strategyId: 'rsi-mean-reversion', assetId: 'BTCUSD', totalTrades: 187, winRate: 63.1, totalReturn: 28.4, sharpeRatio: 1.42, maxDrawdown: -14.2, avgHoldingHours: 18 },
  { strategyId: 'rsi-mean-reversion', assetId: 'ETHUSD', totalTrades: 203, winRate: 61.5, totalReturn: 34.7, sharpeRatio: 1.58, maxDrawdown: -16.8, avgHoldingHours: 15 },
  { strategyId: 'rsi-mean-reversion', assetId: 'XAUUSD', totalTrades: 156, winRate: 65.4, totalReturn: 19.2, sharpeRatio: 1.31, maxDrawdown: -10.5, avgHoldingHours: 22 },
  // MACD Momentum
  { strategyId: 'macd-momentum', assetId: 'BTCUSD', totalTrades: 142, winRate: 57.7, totalReturn: 38.1, sharpeRatio: 1.73, maxDrawdown: -18.4, avgHoldingHours: 32 },
  { strategyId: 'macd-momentum', assetId: 'ETHUSD', totalTrades: 158, winRate: 55.6, totalReturn: 45.2, sharpeRatio: 1.89, maxDrawdown: -21.3, avgHoldingHours: 28 },
  { strategyId: 'macd-momentum', assetId: 'XAUUSD', totalTrades: 119, winRate: 59.3, totalReturn: 14.8, sharpeRatio: 1.12, maxDrawdown: -12.1, avgHoldingHours: 36 },
  // EMA Crossover
  { strategyId: 'ema-crossover', assetId: 'BTCUSD', totalTrades: 164, winRate: 58.5, totalReturn: 31.6, sharpeRatio: 1.55, maxDrawdown: -15.7, avgHoldingHours: 24 },
  { strategyId: 'ema-crossover', assetId: 'ETHUSD', totalTrades: 178, winRate: 56.2, totalReturn: 36.9, sharpeRatio: 1.64, maxDrawdown: -19.1, avgHoldingHours: 20 },
  { strategyId: 'ema-crossover', assetId: 'XAUUSD', totalTrades: 131, winRate: 62.6, totalReturn: 16.3, sharpeRatio: 1.21, maxDrawdown: -9.8, avgHoldingHours: 28 },
  // Bollinger Breakout
  { strategyId: 'bollinger-breakout', assetId: 'BTCUSD', totalTrades: 98, winRate: 67.3, totalReturn: 24.5, sharpeRatio: 1.35, maxDrawdown: -13.6, avgHoldingHours: 14 },
  { strategyId: 'bollinger-breakout', assetId: 'ETHUSD', totalTrades: 112, winRate: 64.3, totalReturn: 29.8, sharpeRatio: 1.47, maxDrawdown: -15.9, avgHoldingHours: 12 },
  { strategyId: 'bollinger-breakout', assetId: 'XAUUSD', totalTrades: 87, winRate: 71.3, totalReturn: 12.1, sharpeRatio: 0.98, maxDrawdown: -8.4, avgHoldingHours: 16 },
  // Multi-TF Confluence
  { strategyId: 'multi-tf-confluence', assetId: 'BTCUSD', totalTrades: 76, winRate: 70.5, totalReturn: 41.3, sharpeRatio: 2.05, maxDrawdown: -11.2, avgHoldingHours: 48 },
  { strategyId: 'multi-tf-confluence', assetId: 'ETHUSD', totalTrades: 83, winRate: 68.7, totalReturn: 43.8, sharpeRatio: 1.96, maxDrawdown: -13.7, avgHoldingHours: 42 },
  { strategyId: 'multi-tf-confluence', assetId: 'XAUUSD', totalTrades: 64, winRate: 72.0, totalReturn: 22.6, sharpeRatio: 1.68, maxDrawdown: -8.9, avgHoldingHours: 52 },
];

// ─── Builders ─────────────────────────────────────────────────

function buildMonthlyReturns(seed: number, totalReturn: number): MonthlyReturn[] {
  const rng = seededRandom(seed);
  const raw: number[] = [];
  for (let i = 0; i < 12; i++) raw.push(rng() - 0.35); // bias slightly positive
  const sum = raw.reduce((a, b) => a + b, 0);
  return MONTHS.map((month, i) => ({
    month,
    value: Math.round(((raw[i] / sum) * totalReturn) * 100) / 100,
  }));
}

export function generateEquityCurve(seed: number, totalReturn: number, maxDrawdown: number, points: number = 252): number[] {
  const rng = seededRandom(seed);
  const curve: number[] = [0];
  const dailyTarget = totalReturn / points;
  const ddDepth = Math.abs(maxDrawdown);

  // Create a realistic curve with drawdown then recovery
  const ddStart = Math.floor(points * 0.3 + rng() * points * 0.2);
  const ddEnd = ddStart + Math.floor(points * 0.1 + rng() * points * 0.1);

  for (let i = 1; i < points; i++) {
    const prev = curve[i - 1];
    let drift = dailyTarget;

    // Drawdown zone: negative drift
    if (i >= ddStart && i < ddEnd) {
      const ddProgress = (i - ddStart) / (ddEnd - ddStart);
      drift = -ddDepth / (ddEnd - ddStart) * (ddProgress < 0.6 ? 1.5 : 0.3);
    }
    // Recovery zone: stronger positive drift
    else if (i >= ddEnd && i < ddEnd + Math.floor(points * 0.1)) {
      drift = dailyTarget * 2.5;
    }

    const noise = (rng() - 0.5) * 1.2;
    curve.push(Math.round((prev + drift + noise) * 100) / 100);
  }

  // Normalize: ensure final value ≈ totalReturn
  const rawMax = curve[curve.length - 1];
  const scale = rawMax !== 0 ? totalReturn / rawMax : 1;

  return curve.map((v) => {
    const scaled = v * scale;
    // Clamp drawdown to not exceed maxDrawdown too much
    if (scaled < maxDrawdown * 1.1) return Math.round(maxDrawdown * (0.95 + rng() * 0.05) * 100) / 100;
    return Math.round(scaled * 100) / 100;
  });
}

// ─── Results Map ──────────────────────────────────────────────

export const RESULTS: Map<string, StrategyResult> = new Map(
  SEED_DATA.map((row) => {
    const key = `${row.strategyId}-${row.assetId}`;
    const seed = hashKey(key);
    return [
      key,
      {
        strategyId: row.strategyId,
        assetId: row.assetId,
        metrics: {
          totalTrades: row.totalTrades,
          winRate: row.winRate,
          totalReturn: row.totalReturn,
          sharpeRatio: row.sharpeRatio,
          maxDrawdown: row.maxDrawdown,
          avgHoldingHours: row.avgHoldingHours,
          startDate: '2025-03-01',
          endDate: '2026-02-28',
        },
        monthlyReturns: buildMonthlyReturns(seed, row.totalReturn),
      },
    ];
  })
);

export function getResult(strategyId: StrategyId, assetId: AssetId): StrategyResult | undefined {
  return RESULTS.get(`${strategyId}-${assetId}`);
}

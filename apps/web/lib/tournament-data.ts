// Seeded PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export interface StrategyResult {
  id: string;
  name: string;
  dailyPnL: number[];
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: number;
  rank: number;
  color: string;
}

export interface TournamentData {
  strategies: StrategyResult[];
  winner: StrategyResult;
  rankedStrategies: StrategyResult[];
}

interface StrategyProfile {
  id: string;
  name: string;
  meanReturn: number;
  volatility: number;
  winBias: number;
  color: string;
}

const STRATEGY_PROFILES: StrategyProfile[] = [
  { id: 'rsi-reversion', name: 'RSI Reversion', meanReturn: 0.12, volatility: 1.8, winBias: 0.54, color: '#10b981' },
  { id: 'macd-trend', name: 'MACD Trend', meanReturn: 0.18, volatility: 2.4, winBias: 0.48, color: '#3b82f6' },
  { id: 'ema-ribbon', name: 'EMA Ribbon', meanReturn: 0.08, volatility: 1.2, winBias: 0.56, color: '#a1a1aa' },
  { id: 'bb-squeeze', name: 'BB Squeeze', meanReturn: 0.15, volatility: 2.0, winBias: 0.50, color: '#ef4444' },
  { id: 'multi-tf', name: 'Multi-TF Confluence', meanReturn: 0.22, volatility: 2.8, winBias: 0.46, color: '#a855f7' },
];

const DAYS = 90;

function simulateStrategy(profile: StrategyProfile): StrategyResult {
  const rng = mulberry32(hashString(profile.name));
  const dailyPnL: number[] = [];
  let wins = 0;
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  let totalTrades = 0;

  for (let d = 0; d < DAYS; d++) {
    const r = rng();
    const isWin = r < profile.winBias;
    // Generate daily return as a percentage
    const magnitude = profile.volatility * (0.3 + rng() * 0.7);
    const dailyReturn = isWin ? magnitude * profile.meanReturn : -magnitude * profile.meanReturn * 0.9;
    dailyPnL.push(Number(dailyReturn.toFixed(4)));

    equity += dailyReturn;
    if (equity > peak) peak = equity;
    const dd = ((peak - equity) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;

    // ~60% of days have trades
    if (rng() < 0.6) totalTrades++;
    if (isWin) wins++;
  }

  const totalReturn = ((equity - 100) / 100) * 100;
  const mean = dailyPnL.reduce((a, b) => a + b, 0) / DAYS;
  const variance = dailyPnL.reduce((a, b) => a + (b - mean) ** 2, 0) / DAYS;
  const stdDev = Math.sqrt(variance) || 0.01;
  const sharpeRatio = (mean / stdDev) * Math.sqrt(252);

  return {
    id: profile.id,
    name: profile.name,
    dailyPnL,
    totalReturn: Number(totalReturn.toFixed(2)),
    winRate: Number(((wins / DAYS) * 100).toFixed(1)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    trades: totalTrades,
    rank: 0,
    color: profile.color,
  };
}

export function getTournamentData(): TournamentData {
  const strategies = STRATEGY_PROFILES.map(simulateStrategy);
  const rankedStrategies = [...strategies].sort((a, b) => b.totalReturn - a.totalReturn);
  rankedStrategies.forEach((s, i) => {
    s.rank = i + 1;
  });
  // Update ranks in original array too
  for (const ranked of rankedStrategies) {
    const orig = strategies.find((s) => s.id === ranked.id);
    if (orig) orig.rank = ranked.rank;
  }

  return {
    strategies,
    winner: rankedStrategies[0],
    rankedStrategies,
  };
}

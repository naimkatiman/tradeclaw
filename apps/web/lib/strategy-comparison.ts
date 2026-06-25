import { getPreset, type StrategyId } from '@tradeclaw/strategies';

const TV_STRATEGY_NAMES: Record<string, string> = {
  'tv-zaky-classic': 'TV Zaky Classic',
  'tv-hafiz-synergy': 'TV Hafiz Synergy',
  'tv-impulse-hunter': 'TV Impulse Hunter',
};

/**
 * Return a human-readable strategy name for any strategy id.
 * Falls back through: @tradeclaw/strategies preset → TV mapping → title-cased id.
 */
export function getStrategyDisplayName(strategyId: string): string {
  try {
    return getPreset(strategyId as StrategyId).name;
  } catch {
    // not a built-in preset
  }
  if (TV_STRATEGY_NAMES[strategyId]) return TV_STRATEGY_NAMES[strategyId];
  // Title-case fallback: classic → Classic, hmm-top3 → Hmm Top 3
  return strategyId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Return a short description for a strategy id, if known.
 */
export function getStrategyDescription(strategyId: string): string | undefined {
  try {
    return getPreset(strategyId as StrategyId).description;
  } catch {
    // not a built-in preset
  }
  if (strategyId.startsWith('tv-')) {
    return 'TradingView webhook-sourced premium signal strategy.';
  }
  return undefined;
}

/**
 * Best-in-class badges for the comparison table.
 */
export interface CategoryWinner {
  strategyId: string;
  value: number;
}

export function computeCategoryWinners(
  rows: Array<{
    strategyId: string;
    hitRate24h: number;
    avgRiskReward: number;
    sharpeRatio: number;
    avgPnl: number;
  }>,
): {
  winRate: CategoryWinner | null;
  riskReward: CategoryWinner | null;
  sharpe: CategoryWinner | null;
  avgPnl: CategoryWinner | null;
} {
  const withSignals = rows.filter((r) => r.hitRate24h > 0 || r.avgPnl !== 0);
  const max = (
    key: 'hitRate24h' | 'avgRiskReward' | 'sharpeRatio' | 'avgPnl',
  ) => {
    const candidates = withSignals.filter((r) => r[key] !== 0);
    if (candidates.length === 0) return null;
    const best = candidates.reduce((a, b) => (a[key] > b[key] ? a : b));
    return { strategyId: best.strategyId, value: best[key] };
  };
  return {
    winRate: max('hitRate24h'),
    riskReward: max('avgRiskReward'),
    sharpe: max('sharpeRatio'),
    avgPnl: max('avgPnl'),
  };
}

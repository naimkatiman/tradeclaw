import type { Strategy, StrategyId } from './types';
import { classicEntry } from './entry/classic';
import { regimeAwareEntry } from './entry/regime-aware';
import { hmmTop3Entry } from './entry/hmm-top3';
import { vwapEmaBbEntry } from './entry/vwap-ema-bb';

export const PRESETS: Record<StrategyId, Strategy> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Baseline RSI + MACD + EMA scoring. No regime filter, no risk breakers.',
    entry: classicEntry,
    allocation: { kind: 'flat' },
    risk: { kind: 'none' },
  },
  'regime-aware': {
    id: 'regime-aware',
    name: 'Regime Aware',
    description: 'Classic signals filtered by HMM regime. Rejects counter-trend trades.',
    entry: regimeAwareEntry,
    allocation: { kind: 'regime-dynamic' },
    risk: { kind: 'daily-streak' },
  },
  'hmm-top3': {
    id: 'hmm-top3',
    name: 'HMM Top-3',
    description: 'Regime-aware signals ranked by confidence, top 3 only. Current production.',
    entry: hmmTop3Entry,
    allocation: { kind: 'regime-dynamic' },
    risk: { kind: 'daily-streak' },
  },
  'vwap-ema-bb': {
    id: 'vwap-ema-bb',
    name: 'VWAP + EMA + Bollinger',
    description: 'Mean-reversion entries at BB extremes with VWAP and EMA trend confirmation.',
    entry: vwapEmaBbEntry,
    allocation: { kind: 'flat' },
    risk: { kind: 'daily-streak' },
  },
  'full-risk': {
    id: 'full-risk',
    name: 'Full Risk Pipeline',
    description: 'HMM top-3 with risk-weighted allocation and full circuit-breaker pipeline.',
    entry: hmmTop3Entry,
    allocation: { kind: 'risk-weighted' },
    risk: { kind: 'full-pipeline' },
  },
};

export function listPresets(): Strategy[] {
  return Object.values(PRESETS);
}

export function getPreset(id: StrategyId): Strategy {
  const p = PRESETS[id];
  if (!p) throw new Error(`Unknown preset id: ${id}`);
  return p;
}

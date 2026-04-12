import type { OHLCV } from '@tradeclaw/core';

export type StrategyId =
  | 'classic'
  | 'regime-aware'
  | 'hmm-top3'
  | 'vwap-ema-bb'
  | 'full-risk';

export interface EntrySignal {
  barIndex: number;
  direction: 'BUY' | 'SELL';
  price: number;
  confidence: number;
  reason?: string;
}

export interface EntryContext {
  symbol: string;
  timeframe: string;
}

export interface EntryModule {
  id: string;
  generateSignals(candles: OHLCV[], context: EntryContext): EntrySignal[];
}

export type AllocationConfig =
  | { kind: 'flat' }
  | { kind: 'regime-dynamic' }
  | { kind: 'risk-weighted' };

export type RiskConfig =
  | { kind: 'none' }
  | { kind: 'daily-streak' }
  | { kind: 'full-pipeline' };

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  entry: EntryModule;
  allocation: AllocationConfig;
  risk: RiskConfig;
}

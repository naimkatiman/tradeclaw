import type { SignalHistoryRecord } from '../signal-history';
import {
  modeledRoundTripCostNotionalPct,
  modeledTradeR,
} from '../modeled-trade-cost';

function record(overrides: Partial<SignalHistoryRecord> = {}): SignalHistoryRecord {
  return {
    id: 'signal-1',
    pair: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 80,
    entryPrice: 100,
    sl: 98,
    timestamp: 1_700_000_000_000,
    outcomes: {
      '4h': null,
      '24h': { price: 102, pnlPct: 2, hit: true, target: 'TP1' },
    },
    ...overrides,
  };
}

describe('modeled trade costs', () => {
  it('labels a persisted emission-time estimate as modeled, not observed', () => {
    expect(modeledRoundTripCostNotionalPct(record({ costEstimatePct: 0.5 }))).toEqual({
      pct: 0.5,
      source: 'emission-time-model',
    });
  });

  it('falls back to the current asset-class model for legacy rows', () => {
    expect(modeledRoundTripCostNotionalPct(record({ costEstimatePct: undefined }))).toEqual({
      pct: 0.4,
      source: 'current-asset-class-fallback-model',
    });
  });

  it('returns risk-normalized gross, modeled cost, and net R', () => {
    expect(modeledTradeR(record({ costEstimatePct: 0.5 }))).toEqual({
      riskPct: 2,
      outcomePnlPct: 2,
      grossR: 1,
      costNotionalPct: 0.5,
      costR: 0.25,
      netR: 0.75,
      costSource: 'emission-time-model',
    });
  });

  it('rejects rows without a valid stop or 24h outcome', () => {
    expect(modeledTradeR(record({ sl: undefined }))).toBeNull();
    expect(modeledTradeR(record({ sl: 100 }))).toBeNull();
    expect(modeledTradeR(record({ outcomes: { '4h': null, '24h': null } }))).toBeNull();
  });
});

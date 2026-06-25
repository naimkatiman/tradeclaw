// apps/web/lib/__tests__/signal-outcome.test.ts
import { classifySignalOutcome, deriveHistoricalOutcomeStatus } from '../signal-outcome';

describe('classifySignalOutcome', () => {
  const buy = { direction: 'BUY' as const, entry: 100, stopLoss: 95, takeProfit1: 105, takeProfit2: 110, takeProfit3: 120 };
  const sell = { direction: 'SELL' as const, entry: 100, stopLoss: 105, takeProfit1: 95, takeProfit2: 90, takeProfit3: 80 };

  it('returns active with progress 0 when price equals entry', () => {
    expect(classifySignalOutcome(buy, 100)).toEqual({ status: 'active', progressPct: 0, hitTarget: null });
  });
  it('returns hit_tp1 when BUY price is between TP1 and TP2', () => {
    expect(classifySignalOutcome(buy, 106)).toMatchObject({ status: 'hit_tp1', hitTarget: 'TP1' });
  });
  it('returns hit_tp2 when BUY price is between TP2 and TP3', () => {
    expect(classifySignalOutcome(buy, 112)).toMatchObject({ status: 'hit_tp2', hitTarget: 'TP2' });
  });
  it('returns hit_tp3 when BUY price is at or above TP3', () => {
    expect(classifySignalOutcome(buy, 121)).toMatchObject({ status: 'hit_tp3', hitTarget: 'TP3' });
  });
  it('returns stopped when BUY price is at or below SL', () => {
    expect(classifySignalOutcome(buy, 94)).toMatchObject({ status: 'stopped', hitTarget: 'SL' });
  });
  it('handles SELL direction symmetrically — TP1 hit when price drops to TP1', () => {
    expect(classifySignalOutcome(sell, 94)).toMatchObject({ status: 'hit_tp1', hitTarget: 'TP1' });
  });
  it('handles SELL stop — price moves up past SL', () => {
    expect(classifySignalOutcome(sell, 106)).toMatchObject({ status: 'stopped', hitTarget: 'SL' });
  });
  it('returns null for status when livePrice is missing', () => {
    expect(classifySignalOutcome(buy, null)).toEqual({ status: 'unknown', progressPct: 0, hitTarget: null });
  });
  it('skips TP3 cleanly when takeProfit3 is null and falls through to TP2', () => {
    const sig = { ...buy, takeProfit3: null as number | null };
    // price 112 is between TP2 (110) and the null TP3 → should report TP2 hit, not TP3
    expect(classifySignalOutcome(sig, 112)).toMatchObject({ status: 'hit_tp2', hitTarget: 'TP2' });
  });
  it('treats null TP2 and TP3 as absent so only TP1 / SL / active states are reachable', () => {
    const sig = { ...buy, takeProfit2: null as number | null, takeProfit3: null as number | null };
    expect(classifySignalOutcome(sig, 130)).toMatchObject({ status: 'hit_tp1', hitTarget: 'TP1' }); // would have been TP3 with full ladder
    expect(classifySignalOutcome(sig, 102)).toMatchObject({ status: 'active' });
  });
  it('treats null stopLoss as locked/absent instead of stopped', () => {
    const sig = { ...sell, stopLoss: null as number | null };
    expect(classifySignalOutcome(sig, 106)).toMatchObject({ status: 'active', hitTarget: null });
  });
});

describe('deriveHistoricalOutcomeStatus', () => {
  it('returns active when the 24h outcome is still missing', () => {
    expect(deriveHistoricalOutcomeStatus(null)).toBe('active');
  });

  it('returns expired for auto-expire sentinel outcomes', () => {
    expect(deriveHistoricalOutcomeStatus({ hit: false, pnlPct: 0 })).toBe('expired');
  });

  it('preserves explicit expired targets from the historical resolver', () => {
    expect(deriveHistoricalOutcomeStatus({ hit: false, pnlPct: 0, target: 'expired' })).toBe('expired');
  });

  it('returns hit_tp1 for resolved winning outcomes', () => {
    expect(deriveHistoricalOutcomeStatus({ hit: true, pnlPct: 1.75 })).toBe('hit_tp1');
  });

  it('preserves explicit TP2 and TP3 targets from historical resolvers', () => {
    expect(deriveHistoricalOutcomeStatus({ hit: true, pnlPct: 2.2, target: 'TP2' })).toBe('hit_tp2');
    expect(deriveHistoricalOutcomeStatus({ hit: true, pnlPct: 3.7, target: 'TP3' })).toBe('hit_tp3');
  });

  it('returns stopped for resolved losing outcomes', () => {
    expect(deriveHistoricalOutcomeStatus({ hit: false, pnlPct: -1.25 })).toBe('stopped');
  });
});

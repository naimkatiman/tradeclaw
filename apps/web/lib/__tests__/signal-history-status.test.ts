import { describe, expect, it } from '@jest/globals';
import {
  FOUR_HOURS_MS,
  TWENTY_FOUR_HOURS_MS,
  getHistoricalOutcomeDisplayStatus,
  isExpiredHistoricalOutcome,
  isExpiredHistoricalSignal,
  isPendingHistoricalOutcome,
  isPendingHistoricalSignal,
} from '../signal-history-status';

function record(overrides: Partial<Parameters<typeof isPendingHistoricalSignal>[0]> = {}) {
  return {
    timestamp: 1_700_000_000_000,
    isSimulated: false,
    gateBlocked: false,
    outcomes: {
      '4h': null,
      '24h': null,
    },
    ...overrides,
  };
}

describe('signal-history-status', () => {
  it('treats rows as pending only inside the 24h window', () => {
    const now = record().timestamp + TWENTY_FOUR_HOURS_MS - 1;
    expect(isPendingHistoricalSignal(record(), now)).toBe(true);
    expect(isExpiredHistoricalSignal(record(), now)).toBe(false);
  });

  it('treats stale unresolved rows as expired after the 24h window', () => {
    const now = record().timestamp + TWENTY_FOUR_HOURS_MS;
    expect(isPendingHistoricalSignal(record(), now)).toBe(false);
    expect(isExpiredHistoricalSignal(record(), now)).toBe(true);
  });

  it('supports shorter 4h windows for the signal detail banner', () => {
    const ts = record().timestamp;
    expect(isPendingHistoricalOutcome(null, ts, FOUR_HOURS_MS, ts + FOUR_HOURS_MS - 1)).toBe(true);
    expect(isExpiredHistoricalOutcome(null, ts, FOUR_HOURS_MS, ts + FOUR_HOURS_MS)).toBe(true);
  });

  it('never marks resolved outcomes as pending or expired', () => {
    const ts = record().timestamp;
    const outcome = { hit: true, pnlPct: 2.5 };
    expect(isPendingHistoricalOutcome(outcome, ts, TWENTY_FOUR_HOURS_MS, ts + TWENTY_FOUR_HOURS_MS + 1)).toBe(false);
    expect(isExpiredHistoricalOutcome(outcome, ts, TWENTY_FOUR_HOURS_MS, ts + TWENTY_FOUR_HOURS_MS + 1)).toBe(false);
  });

  it('maps historical outcome rows to the canonical display states', () => {
    const ts = record().timestamp;

    expect(getHistoricalOutcomeDisplayStatus({ timestamp: ts, outcomes: { '4h': null, '24h': null } }, ts + 1)).toBe('pending');
    expect(getHistoricalOutcomeDisplayStatus({ timestamp: ts, outcomes: { '4h': null, '24h': null } }, ts + TWENTY_FOUR_HOURS_MS)).toBe('expired');
    expect(getHistoricalOutcomeDisplayStatus({ timestamp: ts, outcomes: { '4h': null, '24h': { hit: true, pnlPct: 2.1 } } }, ts + TWENTY_FOUR_HOURS_MS)).toBe('win');
    expect(getHistoricalOutcomeDisplayStatus({ timestamp: ts, outcomes: { '4h': null, '24h': { hit: false, pnlPct: -1.4 } } }, ts + TWENTY_FOUR_HOURS_MS)).toBe('loss');
    expect(getHistoricalOutcomeDisplayStatus({ timestamp: ts, outcomes: { '4h': null, '24h': { hit: false, pnlPct: 0 } } }, ts + TWENTY_FOUR_HOURS_MS)).toBe('expired');
  });
});

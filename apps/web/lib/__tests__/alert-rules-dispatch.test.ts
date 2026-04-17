// apps/web/lib/__tests__/alert-rules-dispatch.test.ts
import { signalMatchesRule } from '../alert-rules-db';

const baseRule = {
  id: 'r1',
  user_id: 'u1',
  name: 'Test',
  symbol: null,
  timeframe: null,
  direction: null,
  min_confidence: 70,
  channels: ['telegram'],
  enabled: true,
};

const baseSignal = {
  symbol: 'BTCUSD',
  timeframe: 'H1',
  direction: 'BUY' as const,
  confidence: 75,
};

describe('signalMatchesRule', () => {
  it('matches when rule has no filters', () => {
    expect(signalMatchesRule(baseSignal, baseRule)).toBe(true);
  });

  it('respects symbol filter', () => {
    const rule = { ...baseRule, symbol: 'XAUUSD' };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
    expect(signalMatchesRule({ ...baseSignal, symbol: 'XAUUSD' }, rule)).toBe(true);
  });

  it('respects direction filter', () => {
    const rule = { ...baseRule, direction: 'SELL' as const };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
    expect(signalMatchesRule({ ...baseSignal, direction: 'SELL' }, rule)).toBe(true);
  });

  it('respects min_confidence filter', () => {
    const rule = { ...baseRule, min_confidence: 80 };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
    expect(signalMatchesRule({ ...baseSignal, confidence: 85 }, rule)).toBe(true);
  });

  it('rejects disabled rules', () => {
    const rule = { ...baseRule, enabled: false };
    expect(signalMatchesRule(baseSignal, rule)).toBe(false);
  });
});

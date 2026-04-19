import { toTeaser, type SignalTeaser } from '../signal-teaser';
import type { TradingSignal } from '../../app/lib/signals';

function makeSignal(over: Partial<TradingSignal> = {}): TradingSignal {
  return {
    id: 'sig-1',
    symbol: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 87,
    entry: 50000,
    stopLoss: 49000,
    takeProfit1: 51000,
    takeProfit2: 52000,
    takeProfit3: 53000,
    timestamp: 1_700_000_000_000,
    source: 'real',
    dataQuality: 'real',
    indicators: { rsi: { value: 60, signal: 'neutral' } },
    ...over,
  } as TradingSignal;
}

describe('signal-teaser — toTeaser', () => {
  it('keeps display-safe fields only', () => {
    const teaser: SignalTeaser = toTeaser(makeSignal());
    expect(teaser).toEqual({
      symbol: 'BTCUSD',
      direction: 'BUY',
      confidence: 87,
      timestamp: 1_700_000_000_000,
    });
  });

  it('strips id, entry, stopLoss, takeProfit*, indicators', () => {
    const teaser = toTeaser(makeSignal()) as unknown as Record<string, unknown>;
    expect('id' in teaser).toBe(false);
    expect('entry' in teaser).toBe(false);
    expect('stopLoss' in teaser).toBe(false);
    expect('takeProfit1' in teaser).toBe(false);
    expect('takeProfit2' in teaser).toBe(false);
    expect('takeProfit3' in teaser).toBe(false);
    expect('indicators' in teaser).toBe(false);
  });

  it('rounds confidence to an integer for the public payload', () => {
    const teaser = toTeaser(makeSignal({ confidence: 87.42 }));
    expect(teaser.confidence).toBe(87);
  });

  it('normalizes a Date-string timestamp to a number', () => {
    const base = makeSignal();
    // Simulate a malformed payload where timestamp slipped through as an ISO
    // string — the function must still produce a numeric output.
    const withStringTs = {
      ...base,
      timestamp: new Date(1_700_000_000_000).toISOString(),
    } as unknown as TradingSignal;
    const teaser = toTeaser(withStringTs);
    expect(typeof teaser.timestamp).toBe('number');
    expect(teaser.timestamp).toBe(1_700_000_000_000);
  });
});

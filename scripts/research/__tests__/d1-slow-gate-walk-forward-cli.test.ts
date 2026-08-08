import crypto from 'crypto';
import {
  decodeFrozenCandleDump,
  filterFrozenWalkForwardWindow,
  serializeWalkForwardArtifact,
} from '../d1-slow-gate-walk-forward';
import {
  D1_SLOW_GATE_WALK_FORWARD_END_TS,
  D1_SLOW_GATE_WALK_FORWARD_START_TS,
} from '../d1-slow-gate-walk-forward-assembly';

const dump = {
  symbol: 'BTCUSD',
  timeframe: 'D1',
  source: 'binance',
  candles: [{
    timestamp: Date.UTC(2026, 7, 7),
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 12,
  }],
};

describe('D1 slow-gate walk-forward CLI boundary', () => {
  it('hashes the full source bytes before accepting matching dump metadata', () => {
    const bytes = Buffer.from(JSON.stringify(dump));
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

    expect(decodeFrozenCandleDump(bytes, 'BTCUSD', sha256)).toEqual({
      symbol: 'BTCUSD',
      sourceSha256: sha256,
      candles: dump.candles,
    });
  });

  it('fails closed on a byte-hash mismatch', () => {
    const bytes = Buffer.from(JSON.stringify(dump));

    expect(() => decodeFrozenCandleDump(bytes, 'BTCUSD', '0'.repeat(64)))
      .toThrow('SHA-256 mismatch');
  });

  it('fails closed when the dump claims a different symbol or timeframe', () => {
    const wrong = Buffer.from(JSON.stringify({ ...dump, timeframe: 'H1' }));
    const sha256 = crypto.createHash('sha256').update(wrong).digest('hex');

    expect(() => decodeFrozenCandleDump(wrong, 'BTCUSD', sha256))
      .toThrow('does not match BTCUSD D1');
  });

  it('filters the verified full dump to the exact inclusive preregistered window', () => {
    const candle = dump.candles[0];
    const input = {
      symbol: 'BTCUSD' as const,
      sourceSha256: 'a'.repeat(64),
      candles: [
        { ...candle, timestamp: D1_SLOW_GATE_WALK_FORWARD_START_TS - 86_400_000 },
        { ...candle, timestamp: D1_SLOW_GATE_WALK_FORWARD_START_TS },
        { ...candle, timestamp: D1_SLOW_GATE_WALK_FORWARD_END_TS },
        { ...candle, timestamp: D1_SLOW_GATE_WALK_FORWARD_END_TS + 86_400_000 },
      ],
    };

    expect(filterFrozenWalkForwardWindow(input).candles.map((item) => item.timestamp))
      .toEqual([D1_SLOW_GATE_WALK_FORWARD_START_TS, D1_SLOW_GATE_WALK_FORWARD_END_TS]);
  });

  it('serializes identical evidence to identical newline-terminated bytes', () => {
    const artifact = { meta: { schemaVersion: 1 }, verdict: 'KILL' };
    const first = serializeWalkForwardArtifact(artifact);
    const second = serializeWalkForwardArtifact(JSON.parse(JSON.stringify(artifact)));

    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
  });
});

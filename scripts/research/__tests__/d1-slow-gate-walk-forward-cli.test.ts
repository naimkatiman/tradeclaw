import crypto from 'crypto';
import {
  decodeFrozenCandleDump,
  serializeWalkForwardArtifact,
} from '../d1-slow-gate-walk-forward';

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

  it('serializes identical evidence to identical newline-terminated bytes', () => {
    const artifact = { meta: { schemaVersion: 1 }, verdict: 'KILL' };
    const first = serializeWalkForwardArtifact(artifact);
    const second = serializeWalkForwardArtifact(JSON.parse(JSON.stringify(artifact)));

    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
  });
});

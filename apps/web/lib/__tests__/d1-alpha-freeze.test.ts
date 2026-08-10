import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  D1_ALPHA_ARTIFACT_SHA256,
  D1_ALPHA_COST_MODEL,
  D1_ALPHA_DATA_SOURCE,
  D1_ALPHA_FREQUENCY_WINDOW_MS,
  D1_ALPHA_MAX_DIRECTION_CHANGES,
  D1_ALPHA_MIN_CALENDAR_DAYS,
  D1_ALPHA_MIN_CLOSED_TRADES,
  D1_ALPHA_MIN_SNAPSHOTS,
  D1_ALPHA_RULE_SHA256,
  D1_ALPHA_STRATEGY_VERSION,
} from '../d1-alpha-protocol';

function normalizedFileSha256(relativePath: string): string {
  const contents = fs
    .readFileSync(path.join(process.cwd(), relativePath), 'utf8')
    .replace(/\r\n?/g, '\n');
  return createHash('sha256').update(contents).digest('hex');
}

describe('D1 alpha rule freeze', () => {
  it('pins the strategy version, data source, costs, frequency ceiling, and observation minimum', () => {
    expect(D1_ALPHA_STRATEGY_VERSION).toBe('d1-slow-gate-v1-2026-08-09');
    expect(D1_ALPHA_DATA_SOURCE).toBe('binance');
    expect(D1_ALPHA_COST_MODEL).toEqual({
      feePctPerSide: 0.05,
      slippagePctPerSide: 0.15,
      fundingPctPer8h: 0.01,
    });
    expect(D1_ALPHA_MAX_DIRECTION_CHANGES).toBe(30);
    expect(D1_ALPHA_FREQUENCY_WINDOW_MS).toBe(365 * 86_400_000);
    expect(D1_ALPHA_MIN_CALENDAR_DAYS).toBe(365);
    expect(D1_ALPHA_MIN_SNAPSHOTS).toBe(365);
    expect(D1_ALPHA_MIN_CLOSED_TRADES).toBe(12);
  });

  it('pins the exact normalized strategy source before prospective outcomes exist', () => {
    expect(normalizedFileSha256('packages/strategies/src/d1-slow-gate.ts')).toBe(
      D1_ALPHA_RULE_SHA256,
    );
  });

  it('pins the exact normalized historical decision artifact', () => {
    expect(normalizedFileSha256(
      'docs/research/experiments/d1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json',
    )).toBe(D1_ALPHA_ARTIFACT_SHA256);
  });
});

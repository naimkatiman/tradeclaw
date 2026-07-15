import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');
}

describe('consensus and calibration fallback integrity', () => {
  it('does not synthesize consensus counts, confidence, rankings, or trends', () => {
    const route = source('app/api/consensus/route.ts');
    const client = source('app/consensus/ConsensusClient.tsx');

    expect(route).not.toContain('charCodeAt');
    expect(route).not.toContain('getTrend24h');
    expect(route).not.toContain("source: 'synthetic'");
    expect(route).not.toContain("?? 'BTCUSD'");
    expect(route).not.toContain(': 50;');
    expect(route).toContain("status: 'unavailable'");
    expect(route).toContain("signal.dataQuality === 'real'");
    expect(client).toContain('No fallback counts or rankings are shown.');
  });

  it('renders calibration fetch failures and empty metrics without demo numbers', () => {
    const client = source('app/calibration/CalibrationClient.tsx');
    const route = source('app/api/calibration/route.ts');

    expect(client).not.toContain('count: 18');
    expect(client).not.toContain('overallAccuracy: 0.700');
    expect(client).not.toContain('brier: 0.21');
    expect(client).not.toContain('fallback demo data');
    expect(client).toContain('No demo buckets or substitute metrics are shown.');
    expect(client).toContain("data.totalSignals === 0 ? '—'");
    expect(route).toContain('const overallAccuracy = totalSignals > 0 ? totalWins / totalSignals : 0');
  });
});

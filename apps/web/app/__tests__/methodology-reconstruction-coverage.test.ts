import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactName = 'regime-expectancy-live-record-crypto-D1-2026-08-05.json';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

/** Mirrors costModelFor's asset classes for the 20 excluded pairs. */
const FX_PAIRS = ['USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'GBPUSD', 'USDJPY', 'EURUSD'];
const OIL_PAIRS = ['WTIUSD'];
const METAL_PAIRS = ['XAGUSD', 'XAUUSD'];
const STOCK_PAIRS = [
  'MSFTUSD',
  'AMZNUSD',
  'AMDUSD',
  'TSLAUSD',
  'METAUSD',
  'AAPLUSD',
  'NVDAUSD',
  'GOOGLUSD',
  'JPMUSD',
  'BACUSD',
];

describe('methodology reconstruction-coverage disclosure boundary', () => {
  const page = read('../methodology/page.tsx');
  const artifact = JSON.parse(read(`../../../../docs/research/experiments/${artifactName}`));
  const coverage = artifact.coverage as {
    countedTrades: number;
    classified: number;
    excludedNoDailyCandles: number;
    excludedPairCount: number;
    excludedPairs: Record<string, number>;
  };

  it('states the headline coverage figure with the artifact numbers', () => {
    expect(coverage.countedTrades).toBe(3157);
    expect(coverage.classified).toBe(1162);
    expect(coverage.excludedNoDailyCandles).toBe(1995);
    expect(coverage.excludedPairCount).toBe(20);

    const sharePct = ((coverage.classified / coverage.countedTrades) * 100).toFixed(1);
    expect(sharePct).toBe('36.8');

    expect(page).toContain('1,162 of its 3,157 counted trades');
    expect(page).toContain('36.8%');
    expect(page).toContain('1,995 trades across 20 non-crypto pairs');
  });

  it('names every excluded pair with its exact trade count', () => {
    const pairs = Object.entries(coverage.excludedPairs);
    expect(pairs).toHaveLength(20);
    for (const [pair, count] of pairs) {
      expect(page).toContain(`'${pair}'`);
      expect(page).toContain(`${pair}', trades: ${count}`);
    }
  });

  it('breaks the exclusion down by asset class, and the classes sum exactly', () => {
    const sum = (names: string[]): number =>
      names.reduce((total, pair) => total + coverage.excludedPairs[pair], 0);

    const fx = sum(FX_PAIRS);
    const oil = sum(OIL_PAIRS);
    const metals = sum(METAL_PAIRS);
    const stocks = sum(STOCK_PAIRS);

    expect(fx).toBe(1147);
    expect(oil).toBe(100);
    expect(metals).toBe(173);
    expect(stocks).toBe(575);
    expect(fx + oil + metals + stocks).toBe(coverage.excludedNoDailyCandles);

    expect(page).toContain("label: 'FX'");
    expect(page).toContain("label: 'Oil'");
    expect(page).toContain("label: 'Metals'");
    expect(page).toContain("label: 'US stocks'");
  });

  it('is dated to the study window, not implied to be a live figure', () => {
    expect(artifact.study.window).toBe('2026-06-10 to 2026-08-04');
    expect(page).toContain('2026-06-10 to 2026-08-04');
    expect(page).toContain('as of that study');
  });

  it('states the reason as a data-availability limit with the licensed-feed condition', () => {
    expect(page).toContain('no D1 candle coverage in the repository candle store');
    expect(page).toContain('blocked upstream');
    expect(page).toContain('licensed daily feed');
  });

  it('is fail-closed: exclusion never reads as an unverified outcome', () => {
    // The excluded trades are real resolved outcomes; only the candle-based
    // independent reconstruction of their entry context is missing.
    expect(page).toContain('still counted, resolved, real trades');
    expect(page).toContain('entry context');
    expect(page).not.toMatch(/outcomes? (?:are|is) unverified/i);
    expect(page).not.toMatch(/cannot be trusted/i);
  });

  it('qualifies the rebuild claim instead of implying uniform verifiability', () => {
    expect(page).toContain('not uniform across the record');
    expect(page).not.toMatch(/every signal can be independently reconstructed/i);
    expect(page).not.toMatch(/fully reproducible record/i);
  });

  it('links the committed artifact and the research entry it comes from', () => {
    expect(page).toContain(`docs/research/experiments/${artifactName}`);
    expect(page).toContain('/research');
  });
});

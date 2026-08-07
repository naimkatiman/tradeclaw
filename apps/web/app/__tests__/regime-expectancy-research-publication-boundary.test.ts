import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactName = 'regime-expectancy-live-record-crypto-D1-2026-08-05.json';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

interface Bucket {
  n: number;
  winRatePct: number;
  grossExpectancyR: number;
  avgCostR: number;
  netExpectancyR: number;
}

/** Renders an R value the way the page writes it: explicit sign, Unicode minus, 4dp. */
function signedR(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(4)}R`;
}

/** Renders a regime row the way the page writes it. */
function regimeRow(bucket: Bucket): string {
  return `gross ${signedR(bucket.grossExpectancyR)} · cost ${bucket.avgCostR.toFixed(4)}R · net ${signedR(bucket.netExpectancyR)}`;
}

describe('regime expectancy research publication boundary', () => {
  const page = read('../research/page.tsx');
  const artifact = JSON.parse(read(`../../../../docs/research/experiments/${artifactName}`));

  it('links the committed machine-readable artifact like every other entry', () => {
    expect(page).toContain(artifactName);
    expect(page).toContain('docs/plans/2026-08-05-regime-expectancy-study.md');
  });

  it('publishes the exact regime buckets from the committed artifact', () => {
    const adx20 = artifact.regimeSplit.adx20;

    expect(adx20.aligned.n).toBe(306);
    expect(adx20.counter.n).toBe(463);
    expect(adx20.sideways.n).toBe(393);

    expect(page).toContain(`Trend-aligned (n=${adx20.aligned.n})`);
    expect(page).toContain(`Counter-trend (n=${adx20.counter.n})`);
    expect(page).toContain(`Sideways (n=${adx20.sideways.n})`);

    expect(page).toContain(regimeRow(adx20.aligned));
    expect(page).toContain(regimeRow(adx20.counter));
    expect(page).toContain(regimeRow(adx20.sideways));
  });

  it('publishes no net-positive regime bucket, because none exists in the artifact', () => {
    const variants = ['adx20', 'adx25', 'er030'] as const;
    const buckets = variants.flatMap((variant) =>
      (['aligned', 'counter', 'sideways'] as const).map(
        (bucket) => artifact.regimeSplit[variant][bucket] as Bucket,
      ),
    );

    expect(buckets).toHaveLength(9);
    for (const bucket of buckets) {
      expect(bucket.netExpectancyR).toBeLessThan(0);
    }
    expect(page).toContain('No regime bucket was net-positive under any detector.');
  });

  it('publishes the exact inversion comparison, including the losing 62.6% win rate', () => {
    const { original, inverted } = artifact.inversion;

    expect(inverted.netExpectancyR).toBeLessThan(original.netExpectancyR);
    expect(page).toContain(
      `As published (n=3,157)', value: 'win rate ${original.winRatePct.toFixed(1)}% · net ${signedR(original.netExpectancyR)}`,
    );
    expect(page).toContain(
      `Every signal flipped (n=3,157)', value: 'win rate ${inverted.winRatePct.toFixed(1)}% · net ${signedR(inverted.netExpectancyR)}`,
    );
    expect(page).toContain('62.6% win rate');
  });

  it('publishes the exact cost curve from the committed artifact', () => {
    const byMultiple = new Map<number, number>(
      artifact.costCurve.map((point: { multiple: number; avgCostR: number }) => [
        point.multiple,
        point.avgCostR,
      ]),
    );

    expect(page).toContain(`Stop width as published', value: '${byMultiple.get(1)!.toFixed(4)}R'`);
    for (const multiple of [3, 5, 10]) {
      expect(page).toContain(`${multiple}× wider', value: '${byMultiple.get(multiple)!.toFixed(4)}R'`);
    }
  });

  it('publishes the integrity gate status exactly as the artifact records it', () => {
    expect(artifact.qualityGates.reconciliation.status).toBe('PASS');
    expect(artifact.qualityGates.reconciliation.failures).toEqual([]);
    expect(artifact.qualityGates.lookahead.status).toBe('PASS');
    expect(artifact.qualityGates.barStaleness.unclassifiedStale).toBe(0);

    expect(page).toContain('Reconciliation PASS · lookahead PASS · 0 stale-bar classifications');
  });

  it('discloses the reconstruction-coverage limit with the artifact numbers', () => {
    expect(artifact.coverage.countedTrades).toBe(3157);
    expect(artifact.coverage.classified).toBe(1162);
    expect(artifact.coverage.excludedNoDailyCandles).toBe(1995);
    expect(artifact.coverage.excludedPairCount).toBe(20);

    expect(page).toContain('1,162 of 3,157 trades were classifiable');
    expect(page).toContain('1,995 trades across 20 non-crypto pairs have no daily candle coverage');
    // The excluded trades are real resolved outcomes; only independent
    // reconstruction of their entry context is missing. Never imply otherwise.
    expect(page).toContain('their outcomes remain counted, resolved trades');
  });

  it('keeps the entry inside its claim boundaries', () => {
    expect(page).toContain('crypto only');
    expect(page).toContain('not broker fills');
    expect(page).toContain('not a trading recommendation');
    expect(page).toContain('No strategy was activated or deactivated by this study.');

    expect(page).not.toMatch(/guaranteed/i);
    expect(page).not.toMatch(/profitable strategy/i);
    expect(page).not.toMatch(/beat the market/i);
    // The study refuted inversion; the page must never read as endorsing it.
    expect(page).not.toMatch(/fade the crowd works/i);
    expect(page).not.toMatch(/inversion works/i);
  });

  it('separates what was pre-registered from the after-the-fact decision to publish', () => {
    expect(artifact.study.registeredOn).toBe('2026-08-05');
    expect(artifact.study.preRegistration).toMatch(/before any data was read/);
    // The spec listed site publication as out of scope, so the page must not
    // claim the publish decision itself was results-agnostic.
    expect(artifact.study.publishDecision).toMatch(/Not pre-registered/);
    expect(page).toContain('before any query ran');
    expect(page).toContain('Publishing this entry was not pre-registered');
    expect(page).not.toMatch(/publish decision did not depend on the outcome/);
  });

  it('keeps the wider-stop cost figures labelled as a cost rescale, not a projected result', () => {
    expect(page).toContain('an analytic rescale of the cost term alone');
    expect(page).toContain('were not simulated and are not knowable from this dataset');
    expect(page).toContain('is not a claim that a wider stop is profitable');
  });

  it('flags the underpowered efficiency-ratio cell it cites', () => {
    const er030Aligned = artifact.regimeSplit.er030.aligned as Bucket & { conclusive: boolean };
    expect(er030Aligned.n).toBe(102);
    expect(er030Aligned.conclusive).toBe(false);
    expect(page).toContain('on 102 trades, below this study’s 300-trade bar');
  });
});

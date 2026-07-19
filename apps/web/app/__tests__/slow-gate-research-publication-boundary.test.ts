import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactName = 'slow-gate-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('slow-gate research publication boundary', () => {
  const page = read('../research/page.tsx');
  const artifact = JSON.parse(
    read(`../../../../docs/research/experiments/${artifactName}`),
  );

  it('publishes the exact full-window portfolio comparison from the committed artifact', () => {
    expect(artifact.portfolio['buy-hold'].metrics).toMatchObject({
      cagr: 0.28087141294666806,
      maxDrawdown: 0.864884221616865,
      calmar: 0.3247503029036542,
      sharpe: 0.7105656203202978,
    });
    expect(artifact.portfolio['ema200-vol'].metrics).toMatchObject({
      cagr: 0.22752358840859088,
      maxDrawdown: 0.3741605272390006,
      calmar: 0.6080908376079361,
      sharpe: 0.8713747876674449,
    });

    expect(page).toContain(artifactName);
    expect(page).toContain('CAGR +28.1% · max DD 86.5% · Calmar 0.32 · Sharpe 0.71');
    expect(page).toContain('CAGR +22.8% · max DD 37.4% · Calmar 0.61 · Sharpe 0.87');
  });

  it('states the narrow result and keeps it outside live and broker-fill claims', () => {
    expect(page).toContain(
      'The 50/50 vol-targeted portfolio did not beat buy-and-hold on CAGR',
    );
    expect(page).toContain('Vol targeting improved modeled drawdown-adjusted results');
    expect(page).toContain('HMM sizing underperformed');
    expect(page).toContain('Sandbox simulation only');
    expect(page).toContain('not live');
    expect(page).toContain('not broker fills');
    expect(page).toContain('not a trading recommendation');
    expect(page).toContain('plain EMA200 gate had isolated raw-CAGR wins');
    expect(page).not.toMatch(/LinkedIn/i);
    expect(page).not.toContain('Nothing did.');
    expect(page).not.toContain('None passed.');
    expect(page).not.toContain('No raw-return win');
  });

  it('backs the fold robustness statement with per-symbol artifact folds', () => {
    for (const symbol of ['BTCUSD', 'ETHUSD']) {
      const wins = artifact.results[symbol].folds.filter(
        (fold: {
          runs: Array<{
            variant: string;
            metrics: { calmar: number };
          }>;
        }) => {
          const hold = fold.runs.find((run) => run.variant === 'buy-hold');
          const vol = fold.runs.find((run) => run.variant === 'ema200-vol');
          return hold && vol && vol.metrics.calmar > hold.metrics.calmar;
        },
      );

      expect(wins).toHaveLength(3);
    }
    expect(page).toContain('Vol-target Calmar > hold, per-symbol folds');
    expect(page).toContain('BTC 3/4 · ETH 3/4');
  });
});

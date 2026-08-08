import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactName =
  'd1-slow-gate-walk-forward-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

function signedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

describe('D1 slow-gate walk-forward research publication boundary', () => {
  const page = read('../research/page.tsx');
  const artifact = JSON.parse(
    read(`../../../../docs/research/experiments/${artifactName}`),
  );

  it('publishes the exact frozen portfolio comparison and registered decision', () => {
    const { strategy, benchmark } = artifact.results.portfolio.full;

    expect(artifact.decision).toMatchObject({
      verdict: 'PASS',
      calmarFoldPasses: 3,
      activationApproved: false,
      lane: 'simulated',
    });
    expect(page).toContain(artifactName);
    expect(page).toContain(
      `${signedPercent(strategy.totalReturn)} · CAGR ${percent(strategy.cagr)} · max DD ${percent(strategy.maxDrawdown)} · Calmar ${strategy.calmar.toFixed(3)}`,
    );
    expect(page).toContain(
      `${signedPercent(benchmark.totalReturn)} · CAGR ${percent(benchmark.cagr)} · max DD ${percent(benchmark.maxDrawdown)} · Calmar ${benchmark.calmar.toFixed(3)}`,
    );
    expect(page).toContain(
      `Calmar ≥ hold, continuous-state folds`,
    );
    expect(page).toContain(`${artifact.decision.calmarFoldPasses}/4`);
  });

  it('cross-checks every published QA, frequency, and cost-risk figure', () => {
    const btc = artifact.results.symbols.BTCUSD;
    const eth = artifact.results.symbols.ETHUSD;

    expect(artifact.qa.passed).toBe(true);
    expect(artifact.qa.lookahead.BTCUSD.passed).toBe(true);
    expect(artifact.qa.lookahead.ETHUSD.passed).toBe(true);
    expect(artifact.qa.cadence.BTCUSD.passed).toBe(true);
    expect(artifact.qa.cadence.ETHUSD.passed).toBe(true);
    expect(page).toContain(
      `BTC ${artifact.qa.reconciliation.BTCUSD.actual}/${artifact.qa.reconciliation.BTCUSD.expected} · ETH ${artifact.qa.reconciliation.ETHUSD.actual}/${artifact.qa.reconciliation.ETHUSD.expected}`,
    );
    expect(page).toContain(
      `BTC ${btc.directionChanges.maxRolling365d} · ETH ${eth.directionChanges.maxRolling365d} (ceiling ${btc.directionChanges.ceiling})`,
    );
    expect(page).toContain(
      `BTC ${btc.stopAudit.maxCostR.toFixed(4)}R · ETH ${eth.stopAudit.maxCostR.toFixed(4)}R`,
    );
    expect(page).toContain(
      'reconciliation PASS · lookahead PASS · cadence PASS',
    );
  });

  it('keeps a historical simulated PASS outside the activation boundary', () => {
    expect(page).toContain('Passed build gate · simulated');
    expect(page).toContain('Simulated lane only; no live activation');
    expect(page).toContain('Activation remains separately gated and unapproved.');
    expect(page).toContain('not live performance');
    expect(page).toContain('not broker fills');
    expect(page).toContain('not a trading recommendation');
    expect(page).not.toContain('D1 slow gate is live');
    expect(page).not.toContain('D1 slow gate was deployed');
  });
});

import {
  D1_ALPHA_ARTIFACT_SHA256,
  D1_ALPHA_DAY_MS,
  D1_ALPHA_RULE_SHA256,
  D1_ALPHA_SIDE_COST_FRACTION,
  D1_ALPHA_STRATEGY_VERSION,
  advanceD1AlphaSnapshot,
  buildD1AlphaHashedSnapshot,
  calculateD1AlphaMetrics,
  createInitialD1AlphaSnapshot,
  evaluateD1AlphaGate,
  hashD1AlphaSnapshot,
  type D1AlphaMetrics,
  type D1AlphaObservation,
  type D1AlphaTransitionObservation,
} from '../d1-alpha-protocol';

const START = Date.UTC(2026, 7, 1);

function observation(
  day: number,
  options: {
    btcClose?: number;
    ethClose?: number;
    btcExposure?: 0 | 1;
    ethExposure?: 0 | 1;
    btcTransition?: D1AlphaTransitionObservation | null;
    ethTransition?: D1AlphaTransitionObservation | null;
  } = {},
): D1AlphaObservation {
  return {
    barTimestamp: START + day * D1_ALPHA_DAY_MS,
    symbols: {
      BTCUSD: {
        symbol: 'BTCUSD',
        source: 'binance',
        close: options.btcClose ?? 100,
        engineExposure: options.btcExposure ?? 0,
        transition: options.btcTransition ?? null,
      },
      ETHUSD: {
        symbol: 'ETHUSD',
        source: 'binance',
        close: options.ethClose ?? 50,
        engineExposure: options.ethExposure ?? 0,
        transition: options.ethTransition ?? null,
      },
    },
  };
}

describe('D1 prospective alpha protocol', () => {
  it('starts both strategy sleeves flat and treats the epoch transition as audit-only', () => {
    const initial = createInitialD1AlphaSnapshot(observation(0, {
      btcExposure: 1,
      btcTransition: { action: 'ENTER_LONG', price: 100 },
    }));

    expect(initial).toMatchObject({
      strategyVersion: D1_ALPHA_STRATEGY_VERSION,
      ruleSha256: D1_ALPHA_RULE_SHA256,
      artifactSha256: D1_ALPHA_ARTIFACT_SHA256,
      strategyPortfolioNav: 1,
      strategyCostIncrement: 0,
      closedTradesIncrement: 0,
      btc: { prospectivePosition: 'FLAT', synchronized: false, strategyNav: 0.5 },
      eth: { prospectivePosition: 'FLAT', synchronized: true, strategyNav: 0.5 },
    });
    expect(initial.benchmarkPortfolioNav).toBeCloseTo(1 - D1_ALPHA_SIDE_COST_FRACTION, 12);
    expect(initial.benchmarkLiquidationNav).toBeCloseTo(
      (1 - D1_ALPHA_SIDE_COST_FRACTION) ** 2,
      12,
    );
  });

  it('opens only on a post-epoch transition, accrues daily funding, and closes at a stop fill', () => {
    const initial = createInitialD1AlphaSnapshot(observation(0));
    const entered = advanceD1AlphaSnapshot(initial, observation(1, {
      btcExposure: 1,
      btcTransition: { action: 'ENTER_LONG', price: 100 },
    }));
    expect(entered.btc.prospectivePosition).toBe('LONG');
    expect(entered.btc.synchronized).toBe(true);
    expect(entered.btc.strategyNav).toBeCloseTo(0.5 * (1 - D1_ALPHA_SIDE_COST_FRACTION), 12);
    expect(entered.closedTradesIncrement).toBe(0);

    const held = advanceD1AlphaSnapshot(entered, observation(2, {
      btcClose: 110,
      btcExposure: 1,
    }));
    expect(held.btc.strategyNav).toBeCloseTo(
      entered.btc.strategyNav * 1.1 * (1 - 0.0003),
      12,
    );
    expect(held.strategyFundingIncrement).toBeGreaterThan(0);

    const exited = advanceD1AlphaSnapshot(held, observation(3, {
      btcClose: 108,
      btcExposure: 0,
      btcTransition: { action: 'EXIT_STOP', price: 105 },
    }));
    expect(exited.btc.prospectivePosition).toBe('FLAT');
    expect(exited.closedTradesIncrement).toBe(1);
    expect(exited.strategyCostIncrement).toBeGreaterThan(0);
    expect(exited.btc.strategyNav).toBeCloseTo(
      held.btc.strategyNav * (105 / 110) * (1 - 0.0003) * (1 - D1_ALPHA_SIDE_COST_FRACTION),
      12,
    );
  });

  it('records a pre-entry exit for audit without manufacturing a trade', () => {
    const initial = createInitialD1AlphaSnapshot(observation(0, { btcExposure: 1 }));
    const exit = advanceD1AlphaSnapshot(initial, observation(1, {
      btcExposure: 0,
      btcTransition: { action: 'EXIT_GATE', price: 99 },
      btcClose: 99,
    }));

    expect(exit.btc.prospectivePosition).toBe('FLAT');
    expect(exit.btc.synchronized).toBe(true);
    expect(exit.btc.strategyNav).toBe(0.5);
    expect(exit.closedTradesIncrement).toBe(0);
    expect(exit.strategyCostIncrement).toBe(0);
  });

  it('refuses cadence gaps and prospective/engine state divergence', () => {
    const initial = createInitialD1AlphaSnapshot(observation(0));
    expect(() => advanceD1AlphaSnapshot(initial, observation(2))).toThrow(
      'refuses gaps and historical backfill',
    );

    const entered = advanceD1AlphaSnapshot(initial, observation(1, {
      btcExposure: 1,
      btcTransition: { action: 'ENTER_LONG', price: 100 },
    }));
    expect(() => advanceD1AlphaSnapshot(entered, observation(2, { btcExposure: 0 }))).toThrow(
      'prospective/engine exposure diverged',
    );

    const inheritedLong = createInitialD1AlphaSnapshot(observation(0, { btcExposure: 1 }));
    expect(() => advanceD1AlphaSnapshot(inheritedLong, observation(1, { btcExposure: 0 }))).toThrow(
      'historical engine exposure changed without an exit',
    );
  });

  it('produces deterministic, previous-row-bound hashes', () => {
    const payload = createInitialD1AlphaSnapshot(observation(0));
    const first = buildD1AlphaHashedSnapshot(payload, null);
    const repeated = hashD1AlphaSnapshot(payload, null);
    const chained = hashD1AlphaSnapshot(payload, 'b'.repeat(64));

    expect(first.rowHash).toBe(repeated);
    expect(first.rowHash).toMatch(/^[0-9a-f]{64}$/);
    expect(chained).not.toBe(first.rowHash);
  });

  it('keeps the status collecting-evidence until every predeclared minimum passes', () => {
    const initial = createInitialD1AlphaSnapshot(observation(0));
    const metrics = calculateD1AlphaMetrics([initial]);
    const gate = evaluateD1AlphaGate(metrics, { cadencePassed: true, integrityPassed: true });

    expect(gate.status).toBe('collecting-evidence');
    expect(gate.performanceGateEvaluated).toBe(false);
    expect(gate.performanceChecks.positiveStrategyReturn).toBeNull();
  });

  it('evaluates performance only after the observation minimum, without promoting current', () => {
    const passing: D1AlphaMetrics = {
      strategyNetReturn: 0.2,
      benchmarkNetReturn: 0.1,
      activeReturn: 0.1,
      strategyMaxDrawdown: 0.1,
      benchmarkMaxDrawdown: 0.2,
      strategyCalmar: 2,
      benchmarkCalmar: 0.5,
      calendarDays: 365,
      snapshots: 365,
      closedTrades: 12,
    };
    const eligible = evaluateD1AlphaGate(passing, {
      cadencePassed: true,
      integrityPassed: true,
    });
    expect(eligible.status).toBe('eligible-for-review');
    expect(eligible.observationMinimumMet).toBe(true);

    const failed = evaluateD1AlphaGate(
      { ...passing, activeReturn: -0.01 },
      { cadencePassed: true, integrityPassed: true },
    );
    expect(failed.status).toBe('failed-gate');
  });
});

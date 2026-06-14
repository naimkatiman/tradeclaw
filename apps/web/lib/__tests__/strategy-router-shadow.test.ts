import {
  getStrategyRouterMode,
  buildRouterShadowBatch,
  type RouterShadowCandidate,
} from '../strategy-router-shadow';
import { fitIsotonic, type IsotonicMap } from '../confidence-calibration';

describe('getStrategyRouterMode — env resolution', () => {
  const ORIGINAL = process.env.TRADECLAW_STRATEGY_ROUTER_MODE;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.TRADECLAW_STRATEGY_ROUTER_MODE;
    else process.env.TRADECLAW_STRATEGY_ROUTER_MODE = ORIGINAL;
  });

  it('defaults to shadow when env is unset (safe default for fresh deploys)', () => {
    delete process.env.TRADECLAW_STRATEGY_ROUTER_MODE;
    expect(getStrategyRouterMode()).toBe('shadow');
  });

  it('honors active', () => {
    process.env.TRADECLAW_STRATEGY_ROUTER_MODE = 'active';
    expect(getStrategyRouterMode()).toBe('active');
  });

  it('honors off', () => {
    process.env.TRADECLAW_STRATEGY_ROUTER_MODE = 'off';
    expect(getStrategyRouterMode()).toBe('off');
  });

  it('falls back to shadow on unknown values rather than crashing', () => {
    process.env.TRADECLAW_STRATEGY_ROUTER_MODE = 'enabled';
    expect(getStrategyRouterMode()).toBe('shadow');
  });

  it('is case-insensitive', () => {
    process.env.TRADECLAW_STRATEGY_ROUTER_MODE = 'ACTIVE';
    expect(getStrategyRouterMode()).toBe('active');
    process.env.TRADECLAW_STRATEGY_ROUTER_MODE = 'Off';
    expect(getStrategyRouterMode()).toBe('off');
  });
});

describe('buildRouterShadowBatch — pure record builder', () => {
  function cand(id: string, symbol: string, direction: 'BUY' | 'SELL', confidence: number): RouterShadowCandidate {
    return { id, symbol, direction, confidence };
  }

  it('routes each candidate by its resolved regime (trend→hmm-top3, volatile/range→vwap-ema-bb)', () => {
    const candidates = [
      cand('a', 'BTCUSD', 'BUY', 80),
      cand('b', 'ETHUSD', 'SELL', 72),
      cand('c', 'SOLUSD', 'BUY', 90),
    ];
    const regimeMap: Record<string, string> = {
      BTCUSD: 'trend',
      ETHUSD: 'volatile',
      SOLUSD: 'range',
    };
    const batch = buildRouterShadowBatch('shadow', candidates, (s) => regimeMap[s], null);

    expect(batch.mode).toBe('shadow');
    expect(batch.candidateCount).toBe(3);
    expect(batch.candidates.map((c) => [c.regime, c.routedStrategy])).toEqual([
      ['trend', 'hmm-top3'],
      ['volatile', 'vwap-ema-bb'],
      ['range', 'vwap-ema-bb'],
    ]);
  });

  it('unknown/missing regime routes to the range strategy (vwap-ema-bb)', () => {
    const batch = buildRouterShadowBatch(
      'shadow',
      [cand('a', 'XAUUSD', 'BUY', 75)],
      () => 'neutral', // off-union legacy label → router runtime fallback
      null,
    );
    expect(batch.candidates[0].routedStrategy).toBe('vwap-ema-bb');
  });

  it('records calibratedConfidence: null when no map is fitted (honest, never fabricated)', () => {
    const batch = buildRouterShadowBatch(
      'shadow',
      [cand('a', 'BTCUSD', 'BUY', 80)],
      () => 'trend',
      null,
    );
    expect(batch.calibrated).toBe(false);
    expect(batch.candidates[0].calibratedConfidence).toBeNull();
  });

  it('applies the isotonic map to the normalized raw confidence when a map exists', () => {
    // Fit a simple monotone map: low confidence → low win rate, high → high.
    const map: IsotonicMap = fitIsotonic([
      { conf: 0.6, win: 0 },
      { conf: 0.6, win: 0 },
      { conf: 0.9, win: 1 },
      { conf: 0.9, win: 1 },
    ])!;
    const batch = buildRouterShadowBatch(
      'shadow',
      [cand('a', 'BTCUSD', 'BUY', 90)], // 0-100 scale → normalized 0.9
      () => 'trend',
      map,
    );
    expect(batch.calibrated).toBe(true);
    const rec = batch.candidates[0];
    expect(rec.rawConfidence).toBeCloseTo(0.9, 6);
    // applyIsotonic at the top breakpoint → its calibrated value (here 1).
    expect(rec.calibratedConfidence).not.toBeNull();
    expect(rec.calibratedConfidence!).toBeCloseTo(1, 6);
  });

  it('normalizes 0-100 confidence to [0,1] in rawConfidence; passes through values already <= 1', () => {
    const hundredScale = buildRouterShadowBatch('shadow', [cand('a', 'BTCUSD', 'BUY', 85)], () => 'trend', null);
    expect(hundredScale.candidates[0].rawConfidence).toBeCloseTo(0.85, 6);
    const unitScale = buildRouterShadowBatch('shadow', [cand('b', 'BTCUSD', 'BUY', 0.85)], () => 'trend', null);
    expect(unitScale.candidates[0].rawConfidence).toBeCloseTo(0.85, 6);
  });

  it('produces an empty candidates array for no candidates', () => {
    const batch = buildRouterShadowBatch('shadow', [], () => 'trend', null);
    expect(batch.candidateCount).toBe(0);
    expect(batch.candidates).toEqual([]);
  });

  it('stamps an ISO-8601 ts and carries the mode through (active records like shadow)', () => {
    const batch = buildRouterShadowBatch('active', [cand('a', 'BTCUSD', 'BUY', 80)], () => 'trend', null);
    expect(batch.mode).toBe('active');
    expect(() => new Date(batch.ts).toISOString()).not.toThrow();
    expect(new Date(batch.ts).toISOString()).toBe(batch.ts);
  });
});

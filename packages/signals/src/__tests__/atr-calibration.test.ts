/**
 * TradeClaw — Per-symbol ATR calibration tests
 * Grid-search tunes ATR stop multiplier from historical outcomes.
 */

import {
  calibrateAtrMultiplier,
  type OutcomeSample,
  type CalibrationResult,
  DEFAULT_ATR_MULTIPLIER,
  ATR_MULTIPLIER_GRID,
  MIN_CALIBRATION_SAMPLES,
} from '../atr-calibration';

function makeSample(partial: Partial<OutcomeSample> & Pick<OutcomeSample, 'outcome' | 'entryAtr' | 'stopDistance'>): OutcomeSample {
  return {
    direction: 'BUY',
    entry: 100,
    stop: partial.direction === 'SELL' ? 100 + partial.stopDistance : 100 - partial.stopDistance,
    target: partial.direction === 'SELL' ? 100 - partial.stopDistance * 2 : 100 + partial.stopDistance * 2,
    ...partial,
  };
}

describe('calibrateAtrMultiplier', () => {
  it('returns default multiplier with low confidence on empty history', () => {
    const result = calibrateAtrMultiplier([]);
    expect(result.multiplier).toBe(DEFAULT_ATR_MULTIPLIER);
    expect(result.confidence).toBe('low');
    expect(result.sampleSize).toBe(0);
  });

  it('returns default multiplier with low confidence when sample below threshold', () => {
    const samples: OutcomeSample[] = Array.from({ length: MIN_CALIBRATION_SAMPLES - 1 }, () =>
      makeSample({ outcome: 'stop', entryAtr: 1, stopDistance: 2, adverseExcursion: 2.5 }),
    );
    const result = calibrateAtrMultiplier(samples);
    expect(result.multiplier).toBe(DEFAULT_ATR_MULTIPLIER);
    expect(result.confidence).toBe('low');
    expect(result.sampleSize).toBe(samples.length);
  });

  it('recommends a looser multiplier when recorded stops were clearly too tight', () => {
    // 15 stop-outs where price barely breached the 2.0×ATR stop (adverse excursion 2.1×ATR)
    // and then would have reversed; a 2.5× or 3.0× stop would have saved them.
    const samples: OutcomeSample[] = [];
    for (let i = 0; i < 20; i++) {
      samples.push(makeSample({
        outcome: 'stop',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 2.2,
      }));
    }
    // Add a few wins with small adverse excursion (wouldn't be affected by tightening)
    for (let i = 0; i < 5; i++) {
      samples.push(makeSample({
        outcome: 'win',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 0.3,
      }));
    }
    const result = calibrateAtrMultiplier(samples);
    expect(result.multiplier).toBeGreaterThanOrEqual(2.25);
    expect(result.confidence).not.toBe('low');
    expect(result.avoidedStopouts).toBeGreaterThan(0);
  });

  it('keeps multiplier near default when stops were already well-sized', () => {
    // Wins with deep excursions close to 2.0; stops cleanly beyond 2.0
    const samples: OutcomeSample[] = [];
    for (let i = 0; i < 15; i++) {
      samples.push(makeSample({
        outcome: 'win',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 1.8,
      }));
    }
    for (let i = 0; i < 10; i++) {
      samples.push(makeSample({
        outcome: 'stop',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 3.5,
      }));
    }
    const result = calibrateAtrMultiplier(samples);
    // Looser stops won't save the 3.5 adverse excursion stops until 3.5+,
    // but tightening would destroy the wins with 1.8 excursion. Best is near default.
    expect(result.multiplier).toBeGreaterThanOrEqual(DEFAULT_ATR_MULTIPLIER);
    expect(result.multiplier).toBeLessThanOrEqual(DEFAULT_ATR_MULTIPLIER + 0.5);
  });

  it('handles mixed realistic scenario and picks best from grid', () => {
    const samples: OutcomeSample[] = [];
    // 12 wins with modest adverse excursion (~0.8 ATR)
    for (let i = 0; i < 12; i++) {
      samples.push(makeSample({
        outcome: 'win',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 0.8,
      }));
    }
    // 8 stop-outs where price went just past 2.0 ATR (could be saved by 2.5×)
    for (let i = 0; i < 8; i++) {
      samples.push(makeSample({
        outcome: 'stop',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 2.3,
      }));
    }
    // 5 losses (TP1 not hit, closed flat) — not stops
    for (let i = 0; i < 5; i++) {
      samples.push(makeSample({
        outcome: 'loss',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 1.5,
      }));
    }
    const result = calibrateAtrMultiplier(samples);
    expect(result.sampleSize).toBe(25);
    expect(ATR_MULTIPLIER_GRID).toContain(result.multiplier);
    // With 8 savable stop-outs and wins unthreatened by any loosening, expect >=2.5
    expect(result.multiplier).toBeGreaterThanOrEqual(2.25);
    expect(result.confidence).toBe('high'); // 25 samples
  });

  it('respects custom default multiplier on low-sample path', () => {
    const result = calibrateAtrMultiplier([], { defaultMultiplier: 1.75 });
    expect(result.multiplier).toBe(1.75);
    expect(result.confidence).toBe('low');
  });

  it('ignores open outcomes', () => {
    const samples: OutcomeSample[] = [];
    for (let i = 0; i < 20; i++) {
      samples.push(makeSample({
        outcome: 'open',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 5.0,
      }));
    }
    const result = calibrateAtrMultiplier(samples);
    expect(result.confidence).toBe('low');
    expect(result.sampleSize).toBe(0);
  });

  it('penalises tighter stops when wins had large adverse excursions', () => {
    // Wins had deep pullbacks, so tightening would flip them to losses
    const samples: OutcomeSample[] = [];
    for (let i = 0; i < 18; i++) {
      samples.push(makeSample({
        outcome: 'win',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 1.8,
      }));
    }
    for (let i = 0; i < 4; i++) {
      samples.push(makeSample({
        outcome: 'stop',
        entryAtr: 1,
        stopDistance: 2.0,
        adverseExcursion: 2.5,
      }));
    }
    const result = calibrateAtrMultiplier(samples);
    // Should not tighten below 1.75 — that would flip the 1.8-excursion wins
    expect(result.multiplier).toBeGreaterThanOrEqual(1.75);
  });
});

describe('calibration grid', () => {
  it('covers the expected range', () => {
    expect(ATR_MULTIPLIER_GRID[0]).toBe(1.0);
    expect(ATR_MULTIPLIER_GRID[ATR_MULTIPLIER_GRID.length - 1]).toBe(3.5);
    expect(ATR_MULTIPLIER_GRID).toContain(2.0);
    expect(ATR_MULTIPLIER_GRID).toContain(2.5);
  });
});

describe('CalibrationResult shape', () => {
  it('includes diagnostic fields', () => {
    const result: CalibrationResult = calibrateAtrMultiplier([]);
    expect(result).toHaveProperty('multiplier');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('sampleSize');
    expect(result).toHaveProperty('avoidedStopouts');
    expect(result).toHaveProperty('winsLost');
    expect(result).toHaveProperty('score');
  });
});

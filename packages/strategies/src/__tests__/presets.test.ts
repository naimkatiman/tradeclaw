import { PRESETS, getPreset, listPresets } from '../presets';
import type { StrategyId } from '../types';

describe('presets registry', () => {
  const expectedIds: StrategyId[] = ['classic', 'regime-aware', 'hmm-top3', 'vwap-ema-bb', 'full-risk'];

  it('contains all 5 preset ids', () => {
    for (const id of expectedIds) {
      expect(PRESETS[id]).toBeDefined();
      expect(PRESETS[id].id).toBe(id);
    }
  });

  it('listPresets() returns all 5', () => {
    expect(listPresets()).toHaveLength(5);
  });

  it('getPreset returns the matching strategy', () => {
    expect(getPreset('hmm-top3').id).toBe('hmm-top3');
  });

  it('getPreset throws on unknown id', () => {
    expect(() => getPreset('bogus' as StrategyId)).toThrow();
  });

  it('each preset has an entry module with a generateSignals function', () => {
    for (const p of listPresets()) {
      expect(typeof p.entry.generateSignals).toBe('function');
    }
  });

  it('full-risk uses hmmTop3 entry (reuses existing module)', () => {
    expect(PRESETS['full-risk'].entry.id).toBe('hmm-top3');
  });
});

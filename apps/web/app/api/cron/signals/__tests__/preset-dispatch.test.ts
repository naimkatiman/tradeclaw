import { getActivePreset } from '../preset-dispatch';

describe('signal engine preset dispatch', () => {
  const originalEnv = process.env.SIGNAL_ENGINE_PRESET;

  beforeEach(() => {
    delete process.env.SIGNAL_ENGINE_PRESET;
  });

  afterEach(() => {
    // Restore original env state
    if (originalEnv === undefined) {
      delete process.env.SIGNAL_ENGINE_PRESET;
    } else {
      process.env.SIGNAL_ENGINE_PRESET = originalEnv;
    }
  });

  it('defaults to hmm-top3 when SIGNAL_ENGINE_PRESET is unset', () => {
    expect(getActivePreset().id).toBe('hmm-top3');
  });

  it('respects SIGNAL_ENGINE_PRESET env var', () => {
    process.env.SIGNAL_ENGINE_PRESET = 'classic';
    expect(getActivePreset().id).toBe('classic');
  });

  it('falls back to hmm-top3 on invalid env value', () => {
    process.env.SIGNAL_ENGINE_PRESET = 'bogus';
    expect(getActivePreset().id).toBe('hmm-top3');
  });

  it('respects regime-aware preset', () => {
    process.env.SIGNAL_ENGINE_PRESET = 'regime-aware';
    expect(getActivePreset().id).toBe('regime-aware');
  });

  it('respects vwap-ema-bb preset', () => {
    process.env.SIGNAL_ENGINE_PRESET = 'vwap-ema-bb';
    expect(getActivePreset().id).toBe('vwap-ema-bb');
  });

  it('respects full-risk preset', () => {
    process.env.SIGNAL_ENGINE_PRESET = 'full-risk';
    expect(getActivePreset().id).toBe('full-risk');
  });
});

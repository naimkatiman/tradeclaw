import { classifyRegime, deriveCard } from '../classifier';
import { ASSET_CLASSES, type RegimeInput } from '../types';

describe('classifyRegime', () => {
  it('returns NEUTRAL when bias is NONE regardless of conviction', () => {
    expect(classifyRegime({ bias: 'NONE', conviction: 0 })).toBe('NEUTRAL');
    expect(classifyRegime({ bias: 'NONE', conviction: 3 })).toBe('NEUTRAL');
  });

  it('returns NEUTRAL when conviction is 0 even with a directional bias', () => {
    expect(classifyRegime({ bias: 'LONG', conviction: 0 })).toBe('NEUTRAL');
    expect(classifyRegime({ bias: 'SHORT', conviction: 0 })).toBe('NEUTRAL');
  });

  it('returns TRENDING for LONG with conviction >= 1', () => {
    expect(classifyRegime({ bias: 'LONG', conviction: 1 })).toBe('TRENDING');
    expect(classifyRegime({ bias: 'LONG', conviction: 2 })).toBe('TRENDING');
    expect(classifyRegime({ bias: 'LONG', conviction: 3 })).toBe('TRENDING');
  });

  it('returns TRENDING for SHORT with conviction >= 1', () => {
    expect(classifyRegime({ bias: 'SHORT', conviction: 1 })).toBe('TRENDING');
    expect(classifyRegime({ bias: 'SHORT', conviction: 3 })).toBe('TRENDING');
  });
});

describe('deriveCard', () => {
  function inputAll(partial: Partial<RegimeInput>): RegimeInput {
    const base = {} as RegimeInput;
    for (const cls of ASSET_CLASSES) {
      base[cls] = { bias: 'NONE', conviction: 0, thesis: '' };
    }
    return { ...base, ...partial };
  }

  const meta = {
    week_start: '2026-06-01',
    set_by: 'admin@tradeclaw.win',
    set_at: '2026-06-01T03:00:00.000Z',
  };

  it('classifies every asset class and fills attribution from meta', () => {
    const input = inputAll({
      crypto: { bias: 'LONG', conviction: 3, thesis: 'BTC breakout' },
      forex: { bias: 'SHORT', conviction: 0, thesis: 'no edge' },
    });

    const card = deriveCard(input, meta);

    // all five classes present
    for (const cls of ASSET_CLASSES) {
      expect(card.classes[cls]).toBeDefined();
      expect(card.classes[cls].set_by).toBe('admin@tradeclaw.win');
      expect(card.classes[cls].set_at).toBe('2026-06-01T03:00:00.000Z');
    }

    expect(card.classes.crypto.regime).toBe('TRENDING');
    expect(card.classes.crypto.thesis).toBe('BTC breakout');
    // conviction 0 => NEUTRAL even though bias is SHORT
    expect(card.classes.forex.regime).toBe('NEUTRAL');
    // untouched class defaults to NEUTRAL
    expect(card.classes.stocks.regime).toBe('NEUTRAL');
  });

  it('carries card-level metadata through', () => {
    const card = deriveCard(inputAll({}), {
      ...meta,
      locked: true,
      override_used: true,
      override_reason: 'late macro print',
    });

    expect(card.week_start).toBe('2026-06-01');
    expect(card.set_by).toBe('admin@tradeclaw.win');
    expect(card.set_at).toBe('2026-06-01T03:00:00.000Z');
    expect(card.locked).toBe(true);
    expect(card.override_used).toBe(true);
    expect(card.override_reason).toBe('late macro print');
  });

  it('defaults card-level metadata when meta omits it', () => {
    const card = deriveCard(inputAll({}), meta);
    expect(card.locked).toBe(false);
    expect(card.override_used).toBe(false);
    expect(card.override_reason).toBeNull();
  });
});

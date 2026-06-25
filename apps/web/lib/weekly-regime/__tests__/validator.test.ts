import { validateRegimeInput, validateCard } from '../validator';
import { ASSET_CLASSES, type RegimeInput, type WeeklyRegimeCard } from '../types';
import { classifyRegime } from '../classifier';

function fullInput(partial: Partial<RegimeInput> = {}): RegimeInput {
  const base = {} as RegimeInput;
  for (const cls of ASSET_CLASSES) {
    base[cls] = { bias: 'NONE', conviction: 0, thesis: '' };
  }
  return { ...base, ...partial };
}

function fullCard(partial: Partial<WeeklyRegimeCard> = {}): WeeklyRegimeCard {
  const classes = {} as WeeklyRegimeCard['classes'];
  for (const cls of ASSET_CLASSES) {
    classes[cls] = {
      bias: 'NONE',
      conviction: 0,
      regime: 'NEUTRAL',
      thesis: '',
      set_by: 'admin@tradeclaw.win',
      set_at: '2026-06-01T03:00:00.000Z',
    };
  }
  return {
    week_start: '2026-06-01',
    classes,
    locked: false,
    override_used: false,
    override_reason: null,
    set_by: 'admin@tradeclaw.win',
    set_at: '2026-06-01T03:00:00.000Z',
    ...partial,
  };
}

describe('validateRegimeInput', () => {
  it('accepts a well-formed input across all five classes', () => {
    const result = validateRegimeInput(
      fullInput({ crypto: { bias: 'LONG', conviction: 3, thesis: 'breakout' } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.crypto.bias).toBe('LONG');
    }
  });

  it('rejects non-object input', () => {
    expect(validateRegimeInput(null).ok).toBe(false);
    expect(validateRegimeInput('nope').ok).toBe(false);
    expect(validateRegimeInput(42).ok).toBe(false);
  });

  it('rejects when an asset class is missing', () => {
    const input = fullInput();
    delete (input as Record<string, unknown>).forex;
    const result = validateRegimeInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/forex/i);
    }
  });

  it('rejects an out-of-range conviction', () => {
    const result = validateRegimeInput(
      fullInput({ crypto: { bias: 'LONG', conviction: 5 as unknown as 3, thesis: '' } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/conviction/i);
    }
  });

  it('rejects an invalid bias value', () => {
    const result = validateRegimeInput(
      fullInput({ crypto: { bias: 'UP' as unknown as 'LONG', conviction: 1, thesis: '' } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/bias/i);
    }
  });

  it('rejects a non-string thesis', () => {
    const result = validateRegimeInput(
      fullInput({ crypto: { bias: 'NONE', conviction: 0, thesis: 5 as unknown as string } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/thesis/i);
    }
  });
});

describe('validateCard', () => {
  it('accepts a well-formed card', () => {
    const result = validateCard(fullCard());
    expect(result.ok).toBe(true);
  });

  it('rejects when regime does not match classifyRegime(bias, conviction)', () => {
    // bias LONG + conviction 3 should be TRENDING; store NEUTRAL to trip the check.
    const card = fullCard();
    card.classes.crypto = {
      bias: 'LONG',
      conviction: 3,
      regime: 'NEUTRAL',
      thesis: 'wrong regime',
      set_by: 'admin@tradeclaw.win',
      set_at: '2026-06-01T03:00:00.000Z',
    };
    // sanity: classifier disagrees with the stored regime
    expect(classifyRegime({ bias: 'LONG', conviction: 3 })).toBe('TRENDING');

    const result = validateCard(card);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/regime/i);
      expect(result.errors.join(' ')).toMatch(/crypto/i);
    }
  });

  it('rejects a card missing required string fields', () => {
    const card = fullCard();
    delete (card as unknown as Record<string, unknown>).set_by;
    const result = validateCard(card);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/set_by/i);
    }
  });

  it('rejects a card missing an asset class', () => {
    const card = fullCard();
    delete (card.classes as Record<string, unknown>).indices;
    const result = validateCard(card);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/indices/i);
    }
  });

  it('rejects non-object input', () => {
    expect(validateCard(null).ok).toBe(false);
    expect(validateCard([]).ok).toBe(false);
  });

  it('requires override_reason to be a string or null', () => {
    const result = validateCard(fullCard({ override_reason: 123 as unknown as string }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/override_reason/i);
    }
  });
});

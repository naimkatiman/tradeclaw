import { parseAdminNote } from '../parser';
import { ASSET_CLASSES, type RegimeInput } from '../types';

/** Assert a parse succeeded and return the input for further assertions. */
function ok(text: string): RegimeInput {
  const result = parseAdminNote(text);
  if (!result.ok) {
    throw new Error(`expected ok parse for ${JSON.stringify(text)}, got clarify: ${result.clarify}`);
  }
  return result.input;
}

describe('parseAdminNote', () => {
  it('always returns all five asset classes, defaulting unmentioned to NONE/0/empty thesis', () => {
    const input = ok('crypto long strong');
    for (const cls of ASSET_CLASSES) {
      expect(input[cls]).toBeDefined();
    }
    // unmentioned classes default to NEUTRAL inputs
    expect(input.commodities).toEqual({ bias: 'NONE', conviction: 0, thesis: '' });
    expect(input.stocks).toEqual({ bias: 'NONE', conviction: 0, thesis: '' });
    expect(input.forex).toEqual({ bias: 'NONE', conviction: 0, thesis: '' });
    expect(input.indices).toEqual({ bias: 'NONE', conviction: 0, thesis: '' });
  });

  it('parses the canonical multi-class note', () => {
    const input = ok('crypto long strong, gold range, EURUSD short into NFP, indices flat, stocks neutral');
    expect(input.crypto.bias).toBe('LONG');
    expect(input.crypto.conviction).toBe(3);
    // gold -> commodities, "range" => NONE bias => conviction 0
    expect(input.commodities.bias).toBe('NONE');
    expect(input.commodities.conviction).toBe(0);
    // EURUSD -> forex, short, no qualifier => conviction 2
    expect(input.forex.bias).toBe('SHORT');
    expect(input.forex.conviction).toBe(2);
    expect(input.indices.bias).toBe('NONE');
    expect(input.indices.conviction).toBe(0);
    expect(input.stocks.bias).toBe('NONE');
    expect(input.stocks.conviction).toBe(0);
  });

  it('directional bias with no conviction qualifier defaults to conviction 2', () => {
    const input = ok('btc bullish');
    expect(input.crypto.bias).toBe('LONG');
    expect(input.crypto.conviction).toBe(2);
  });

  it('maps medium/moderate to conviction 2 and weak/slight/low to conviction 1', () => {
    const medium = ok('crypto long medium');
    expect(medium.crypto.conviction).toBe(2);
    const weak = ok('crypto long weak');
    expect(weak.crypto.conviction).toBe(1);
    const slight = ok('crypto bullish slight');
    expect(slight.crypto.conviction).toBe(1);
  });

  it('handles mixed casing and abbreviations', () => {
    const input = ok('BITCOIN BUY AGGRESSIVE; FX SELL');
    expect(input.crypto.bias).toBe('LONG');
    expect(input.crypto.conviction).toBe(3);
    expect(input.forex.bias).toBe('SHORT');
    expect(input.forex.conviction).toBe(2);
  });

  it('maps every class keyword family to the right asset class', () => {
    const input = ok('bitcoin up, oil down, equities long, gbpusd short, nasdaq long');
    expect(input.crypto.bias).toBe('LONG');
    expect(input.commodities.bias).toBe('SHORT');
    expect(input.stocks.bias).toBe('LONG');
    expect(input.forex.bias).toBe('SHORT');
    expect(input.indices.bias).toBe('LONG');
  });

  it('treats range/sideways/chop/no edge as NONE bias with conviction 0', () => {
    const input = ok('crypto sideways, gold chop, stocks no edge, forex range, indices flat');
    for (const cls of ASSET_CLASSES) {
      expect(input[cls].bias).toBe('NONE');
      expect(input[cls].conviction).toBe(0);
    }
  });

  it('does not substring-match short keywords inside unrelated words', () => {
    // "group" contains "up", "below" contains "low", "into" contains no class.
    // None of these should set any directional bias or class.
    const input = ok('crypto long strong');
    // sanity: only crypto was set
    expect(input.crypto.bias).toBe('LONG');
    const noise = ok('crypto long, the group dropped below the range into chop');
    // crypto correctly parsed; "group/below/into" must not invent bias on other classes
    expect(noise.crypto.bias).toBe('LONG');
    expect(noise.commodities.bias).toBe('NONE');
    expect(noise.stocks.bias).toBe('NONE');
    expect(noise.indices.bias).toBe('NONE');
  });

  it('does not let bare usd match inside eurusd (both resolve to forex regardless)', () => {
    const input = ok('eurusd long');
    expect(input.forex.bias).toBe('LONG');
    expect(input.forex.conviction).toBe(2);
  });

  it('captures a per-class thesis from the segment text', () => {
    const input = ok('crypto long strong, EURUSD short into NFP');
    expect(input.crypto.thesis).toBe('crypto long strong');
    expect(input.forex.thesis).toBe('EURUSD short into NFP');
    // unmentioned class has empty thesis
    expect(input.stocks.thesis).toBe('');
  });

  it('resolves two same-direction words to one bias (not a conflict)', () => {
    const input = ok('crypto long bull strong');
    expect(input.crypto.bias).toBe('LONG');
    expect(input.crypto.conviction).toBe(3);
  });

  // ── ambiguity: must return clarify ───────────────────────────────

  it('returns clarify on conflicting bias words for one class', () => {
    const result = parseAdminNote('crypto long but also short');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.clarify).toMatch(/crypto/i);
      expect(typeof result.clarify).toBe('string');
      expect(result.clarify.length).toBeGreaterThan(0);
    }
  });

  it('returns clarify when a class is mentioned with no parseable direction', () => {
    // "gold" mentioned but no bias word anywhere in its segment
    const result = parseAdminNote('crypto long, gold');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.clarify).toMatch(/commodities|gold/i);
    }
  });

  it('asks about the first problematic class in ASSET_CLASSES order', () => {
    // both stocks (no bias) and forex (conflict) are problematic;
    // stocks comes first in ASSET_CLASSES order.
    const result = parseAdminNote('stocks, eurusd long short');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.clarify).toMatch(/stocks/i);
    }
  });

  it('returns clarify on a cross-segment direction flip for one class', () => {
    // crypto resolves LONG in segment 1 and SHORT in segment 2 -> conflict.
    const result = parseAdminNote('crypto long, crypto short');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.clarify).toMatch(/crypto/i);
    }
  });

  it('does not flag a no-direction mention later resolved by another segment', () => {
    // first "crypto" has no direction; second "crypto long" resolves it. Legal.
    const input = ok('crypto, crypto long');
    expect(input.crypto.bias).toBe('LONG');
    expect(input.crypto.conviction).toBe(2);
  });
});

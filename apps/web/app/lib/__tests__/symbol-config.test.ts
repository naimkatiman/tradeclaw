import {
  MAJORS_SYMBOLS,
  SYMBOLS,
  THEMATIC_SYMBOLS,
  symbolsForCategory,
} from '../symbol-config';

describe('symbol-config asset categories', () => {
  it('pins the current tracked universe and category counts', () => {
    expect(SYMBOLS.length).toBe(26);
    expect(MAJORS_SYMBOLS.length).toBe(8);
    expect(THEMATIC_SYMBOLS.length).toBe(18);
  });

  it('assigns every symbol to exactly one supported category', () => {
    for (const symbol of SYMBOLS) {
      expect(['majors', 'thematic']).toContain(symbol.category);
    }

    const uniqueSymbols = new Set(SYMBOLS.map(s => s.symbol));
    expect(uniqueSymbols.size).toBe(SYMBOLS.length);
  });

  it('returns all symbols for the all category', () => {
    expect([...symbolsForCategory('all')].sort()).toEqual(
      SYMBOLS.map(s => s.symbol).sort(),
    );
  });

  it('keeps majors and thematic disjoint and exhaustive', () => {
    const majors = new Set(MAJORS_SYMBOLS);
    const thematic = new Set(THEMATIC_SYMBOLS);

    for (const symbol of majors) {
      expect(thematic.has(symbol)).toBe(false);
    }

    expect(new Set([...majors, ...thematic])).toEqual(
      new Set(SYMBOLS.map(s => s.symbol)),
    );
  });

  it('pins the curated majors bucket', () => {
    expect([...MAJORS_SYMBOLS].sort()).toEqual([
      'BTCUSD',
      'ETHUSD',
      'EURUSD',
      'GBPUSD',
      'QQQUSD',
      'SPYUSD',
      'USDJPY',
      'XAUUSD',
    ].sort());
  });
});

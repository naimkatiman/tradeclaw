import { resolveRegimeStyle } from './GateStateBadge';

describe('resolveRegimeStyle', () => {
  test('maps each canonical structural regime to its own style', () => {
    expect(resolveRegimeStyle('trend').label).toBe('TREND');
    expect(resolveRegimeStyle('volatile').label).toBe('VOLATILE');
    expect(resolveRegimeStyle('range').label).toBe('RANGE');

    const classNames = ['trend', 'volatile', 'range'].map(
      (r) => resolveRegimeStyle(r).className,
    );
    expect(new Set(classNames).size).toBe(3); // visually distinct
  });

  test('unknown labels render a graceful fallback instead of crashing', () => {
    // The pre-Phase-3 implementation did REGIME_STYLES[regime].label, which
    // throws at render for any label outside the hardcoded union — e.g. an
    // old-vocabulary row ('neutral') or a future label from a newer API.
    const style = resolveRegimeStyle('neutral');
    expect(style.label).toBe('NEUTRAL'); // surfaces the raw label for operators
    expect(style.className).toContain('zinc'); // muted fallback styling
  });

  test('null/undefined/empty regimes fall back without throwing', () => {
    for (const raw of [null, undefined, '']) {
      const style = resolveRegimeStyle(raw);
      expect(style.label).toBe('UNKNOWN');
      expect(typeof style.className).toBe('string');
      expect(style.className.length).toBeGreaterThan(0);
    }
  });

  test('does not inherit styles via the prototype chain', () => {
    expect(resolveRegimeStyle('constructor').label).toBe('CONSTRUCTOR');
    expect(resolveRegimeStyle('toString').label).toBe('TOSTRING');
  });
});

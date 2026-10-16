import { normalizeTheme } from '../theme-state';

describe('normalizeTheme', () => {
  it.each(['dark', 'light', 'system'] as const)('preserves supported theme %s', (theme) => {
    expect(normalizeTheme(theme)).toBe(theme);
  });

  it.each([undefined, null, '', 'sepia', 1, {}])('falls back safely for %p', (theme) => {
    expect(normalizeTheme(theme)).toBe('dark');
  });
});

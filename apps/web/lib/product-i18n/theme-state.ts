export const THEMES = ['dark', 'light', 'system'] as const;

export type ThemeName = (typeof THEMES)[number];

export function normalizeTheme(value: unknown): ThemeName {
  return typeof value === 'string' && THEMES.includes(value as ThemeName)
    ? value as ThemeName
    : 'dark';
}

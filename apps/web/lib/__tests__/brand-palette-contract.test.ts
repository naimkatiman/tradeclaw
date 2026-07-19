import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}

function repoSource(path: string): string {
  return readFileSync(resolve(__dirname, '../../../..', path), 'utf8');
}

const brandOwnedFiles = [
  'app/globals.css',
  'app/api/og/route.tsx',
  'app/components/navbar.tsx',
  'components/background/AuroraLayer.tsx',
  'components/brand/tradeclaw-icon-artwork.tsx',
  'components/tradeclaw-logo.tsx',
  'public/bg/aurora-orb.svg',
  'public/icon.svg',
] as const;

const retiredBrandLiterals = [
  '#15d8f4',
  '#2adff7',
  '#08c8e2',
  '#006b82',
  '#0891b2',
  '#06b6d4',
  '#b9f7ff',
  '#9ceffc',
  '#d9fbff',
  '#dffbff',
  '#0ea5a4',
  '#9ff6cf',
  '#c7ffe4',
  '#163229',
  '#12343c',
  'rgba(21,216,244',
  'rgba(42,223,247',
  'rgba(0,107,130',
  'rgba(0,151,178',
  'rgba(8,200,226',
  'rgba(6,182,212',
] as const;

describe('TradeClaw emerald brand palette contract', () => {
  it('keeps retired cyan literals out of brand-owned surfaces', () => {
    const combined = [...brandOwnedFiles.map((path) => source(path)), repoSource('docs/assets/logo.svg')]
      .map((contents) => contents.toLowerCase().replace(/\s+/g, ''))
      .join('\n');

    for (const literal of retiredBrandLiterals) {
      expect(combined).not.toContain(literal);
    }
  });

  it('keeps the semantic brand tokens on the canonical emerald family', () => {
    const globals = source('app/globals.css');

    expect(globals).toContain('--color-brand: #10b981');
    expect(globals).toContain('--brand: #047857');
    expect(globals).toContain('--brand: #34d399');
    expect(globals).toContain('--brand-bright: #10b981');
    expect(globals).toContain('--ring: rgba(4, 120, 87, 0.72)');
    expect(globals).toContain('--ring: rgba(52, 211, 153, 0.52)');
  });

  it('keeps every TradeClaw-owned icon on the favicon palette', () => {
    const icons = [
      source('components/brand/tradeclaw-icon-artwork.tsx'),
      source('components/tradeclaw-logo.tsx'),
      source('public/icon.svg'),
      repoSource('docs/assets/logo.svg'),
    ];

    for (const icon of icons) {
      expect(icon).toContain('#bbf7d0');
      expect(icon).toContain('#10b981');
      expect(icon).toContain('#047857');
      expect(icon).toContain('#153d2e');
      expect(icon).toContain('#f5f5f0');
    }
  });

  it('keeps branded chrome and atmosphere emerald', () => {
    expect(source('app/components/navbar.tsx')).toContain('hover:bg-[#dcfce7]');
    expect(source('app/api/og/route.tsx')).toContain('#10b981');
    expect(source('components/background/AuroraLayer.tsx')).toContain('rgba(52,211,153,0.18)');
    expect(source('public/bg/aurora-orb.svg')).toContain('orb-emerald-soft');
  });
});

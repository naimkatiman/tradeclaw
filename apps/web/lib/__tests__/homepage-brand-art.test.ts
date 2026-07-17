import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function webSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');
}

describe('homepage brand artwork boundary', () => {
  const layout = webSource('app/layout.tsx');
  const homepage = webSource('app/page.tsx');
  const artwork = webSource('components/landing/hero-brand-art.tsx');
  const styles = webSource('app/globals.css');

  it('mounts one artwork instance on the root homepage instead of the root layout', () => {
    expect(homepage.match(/<HeroBrandArt\s*\/>/g)).toHaveLength(1);
    expect(layout).not.toContain('HeroBrandArt');
    expect(layout).not.toContain('GlobalClawBackdrop');
  });

  it('uses exactly one decorative raster and no Remotion runtime', () => {
    expect(artwork.match(/\.webp/g)).toHaveLength(1);
    expect(artwork).toContain('tradeclaw-market-sculpture-v1.webp');
    expect(artwork.toLowerCase()).not.toContain('remotion');
  });

  it('keeps scroll parallax progressive and reduced-motion safe', () => {
    expect(styles).toContain('@supports (animation-timeline: scroll())');
    expect(styles).toContain('animation-timeline: scroll(root block)');
    expect(styles).toContain('animation: heroArtParallax linear both');

    const reducedMotionBlock = styles.slice(
      styles.indexOf('@media (prefers-reduced-motion: reduce)'),
    );
    expect(reducedMotionBlock).toContain('.hero-brand-art__parallax');
    expect(reducedMotionBlock).toContain('animation: none !important');
    expect(reducedMotionBlock).toContain('transform: none !important');
  });
});

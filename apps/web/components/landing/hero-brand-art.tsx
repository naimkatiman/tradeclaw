import Image from 'next/image';
import marketSculpture from '../../public/brand/tradeclaw-market-sculpture-v1.webp';

/**
 * One restrained decorative sculpture for the landing hero.
 *
 * The artwork never substitutes for the real Cost Field or carries product
 * claims. It stays behind the hero copy, cannot intercept interaction, and
 * uses CSS-only progressive parallax with a reduced-motion-safe static state.
 */
export function HeroBrandArt() {
  return (
    <div className="hero-brand-art" data-testid="hero-brand-art" aria-hidden="true">
      <div className="hero-brand-art__frame">
        <div className="hero-brand-art__halo" />
        <div className="hero-brand-art__parallax">
          <div className="hero-brand-art__object">
            <Image
              src={marketSculpture}
              alt=""
              className="hero-brand-art__image"
              sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 1px"
            />
          </div>
        </div>
        <span className="hero-brand-art__scan" />
      </div>
    </div>
  );
}

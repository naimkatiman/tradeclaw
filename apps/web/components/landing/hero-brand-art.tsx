import Image from 'next/image';

/**
 * Decorative brand motion for the landing hero.
 *
 * The artwork never substitutes for the real Cost Field or carries product
 * claims. CSS hides it below the desktop breakpoint and disables every motion
 * layer when the visitor prefers reduced motion.
 */
export function HeroBrandArt() {
  return (
    <div className="hero-brand-art" data-testid="hero-brand-art" aria-hidden="true">
      <div className="hero-brand-art__frame">
        <div className="hero-brand-art__halo" />
        <div className="hero-brand-art__object">
          <Image
            src="/brand/tradeclaw-market-sculpture-v1.webp"
            alt=""
            width={1254}
            height={1254}
            className="hero-brand-art__image"
            sizes="(min-width: 1280px) 560px, (min-width: 1024px) 46vw, 1px"
            loading="eager"
          />
        </div>
        <span className="hero-brand-art__scan" />
      </div>
    </div>
  );
}

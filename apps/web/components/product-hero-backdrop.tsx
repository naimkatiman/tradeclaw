import Image from 'next/image';

interface ProductHeroBackdropProps {
  src: string;
  testId: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Quiet generated artwork for product-page hero copy.
 *
 * The host owns the stacking context (`relative isolate`). This component is
 * decorative only, stays bounded to that host, and leaves narrow phone reading
 * flows image-free.
 */
export function ProductHeroBackdrop({
  src,
  testId,
  className = '',
  priority = false,
  sizes = '(min-width: 1280px) 720px, (min-width: 768px) 62vw, 1px',
}: ProductHeroBackdropProps) {
  return (
    <div
      className={`product-hero-backdrop ${className}`.trim()}
      data-testid={testId}
      aria-hidden="true"
    >
      <div className="product-hero-backdrop__frame">
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="product-hero-backdrop__image"
          priority={priority}
        />
      </div>
    </div>
  );
}

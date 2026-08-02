import Image from 'next/image';

interface EditorialHeroArtProps {
  src: string;
  testId: string;
}

/**
 * Decorative generated artwork for text-first editorial heroes.
 *
 * The image stays out of the mobile reading flow and never carries copy,
 * evidence, or product claims. Explicit source dimensions keep optimization in
 * Next.js without adding client JavaScript.
 */
export function EditorialHeroArt({ src, testId }: EditorialHeroArtProps) {
  return (
    <div
      className="editorial-hero-art hidden lg:block"
      data-testid={testId}
      aria-hidden="true"
    >
      <Image
        src={src}
        alt=""
        width={1254}
        height={1254}
        className="editorial-hero-art__image"
        sizes="(min-width: 1024px) 320px, 1px"
      />
    </div>
  );
}

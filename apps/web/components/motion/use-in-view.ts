'use client';

/**
 * Shared IntersectionObserver hook. SSR-safe; environments without
 * IntersectionObserver degrade to "in view" so content never hides.
 */

import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  /** Stop observing after the first intersection (default true). */
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function useInView<T extends Element>({
  once = true,
  threshold = 0.4,
  rootMargin,
}: UseInViewOptions = {}): { ref: React.RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // rAF-deferred so the setState is not synchronous within the effect
      // (house lint rule); environments without IO degrade to "in view".
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);

  return { ref, inView };
}

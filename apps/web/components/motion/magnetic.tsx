'use client';

/**
 * Magnetic — subtle pointer-follow for the single primary action
 * (DESIGN.md Motion: ≤6px translate, fine pointers only, no bounce).
 * Children are passed through untouched (Server Components welcome);
 * the wrapper div carries the transform. Touch and reduced-motion
 * users get a plain wrapper with no listeners doing work.
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './use-reduced-motion';

const MAX_OFFSET_PX = 6;
const LERP = 0.18;

export function Magnetic({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const settle = () => {
      const dx = target.current.x - current.current.x;
      const dy = target.current.y - current.current.y;
      current.current.x += dx * LERP;
      current.current.y += dy * LERP;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        current.current = { ...target.current };
        el.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`;
        raf.current = 0;
        return;
      }
      el.style.transform = `translate(${current.current.x}px, ${current.current.y}px)`;
      raf.current = requestAnimationFrame(settle);
    };

    const schedule = () => {
      if (!raf.current) raf.current = requestAnimationFrame(settle);
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5;
      const relY = (event.clientY - rect.top) / rect.height - 0.5;
      target.current = {
        x: relX * 2 * MAX_OFFSET_PX,
        y: relY * 2 * MAX_OFFSET_PX,
      };
      schedule();
    };

    const onLeave = () => {
      target.current = { x: 0, y: 0 };
      schedule();
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      el.style.transform = '';
    };
  }, [reducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

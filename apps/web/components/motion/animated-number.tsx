'use client';

/**
 * AnimatedNumber — count-up for real, already-known values.
 *
 * The final formatted value is rendered as the initial text (server-safe:
 * without JS or with reduced motion the true number is simply there).
 * When the element scrolls into view the magnitude eases 0 → |value| with
 * ease-out-quart (DESIGN.md Motion). Formatting is declarative props, not a
 * function, because instances are rendered from Server Components.
 */

import { useEffect, useState } from 'react';
import { useInView } from './use-in-view';
import { useReducedMotion } from './use-reduced-motion';

interface AnimatedNumberProps {
  value: number;
  /** Fraction digits to render (derive from the API-rounded value). */
  decimals?: number;
  /** Leading +/− derived from the value's sign (true minus U+2212). */
  signed?: boolean;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

function formatValue(
  magnitude: number,
  { value, decimals = 0, signed = false, suffix = '' }: AnimatedNumberProps,
): string {
  const sign = signed ? (value >= 0 ? '+' : '−') : value < 0 ? '−' : '';
  const body = magnitude.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${body}${suffix}`;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function AnimatedNumber(props: AnimatedNumberProps) {
  const { value, durationMs = 1100, className } = props;
  const { ref, inView } = useInView<HTMLSpanElement>({ once: true, threshold: 0.5 });
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => formatValue(Math.abs(value), props));

  const decimals = props.decimals ?? 0;
  const signed = props.signed ?? false;
  const suffix = props.suffix ?? '';

  useEffect(() => {
    if (!inView || reducedMotion) return;
    const magnitude = Math.abs(value);
    const opts = { value, decimals, signed, suffix };
    const duration = Math.max(1, durationMs);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(formatValue(magnitude * easeOutQuart(t), opts));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reducedMotion, value, decimals, signed, suffix, durationMs]);

  // Under reduced motion the true value is rendered directly — including
  // when the preference flips mid-count-up, which would otherwise leave
  // `display` frozen at a partial eased number.
  return (
    <span ref={ref} className={className}>
      {reducedMotion ? formatValue(Math.abs(value), props) : display}
    </span>
  );
}

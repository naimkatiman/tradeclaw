'use client';

import { HelpCircle } from 'lucide-react';

interface InfoHintProps {
  /** Long-form explanation shown on hover. Plain text only. */
  text: string;
  /** Optional aria-label override; defaults to `text`. */
  label?: string;
  /** Tailwind class for icon size — defaults to h-3 w-3 to match small captions. */
  size?: string;
  /** Tailwind class for icon colour — defaults to muted; pass a brighter
   * variant where the surrounding text is bold or a hero stat. */
  className?: string;
}

/**
 * `?` icon paired with a native `title` tooltip. Used next to numeric stats
 * whose math isn't self-evident — total return, win rate, drawdown — so the
 * page can stay terse without the reader having to guess what each metric
 * actually counts.
 *
 * Native `title` is intentional: zero JS, no portal, no z-index fights, and
 * accessible to keyboard + screen readers via aria-label. Swap to a richer
 * popover only when one stat needs formatting the title attr can't render.
 */
export function InfoHint({ text, label, size = 'h-3 w-3', className }: InfoHintProps) {
  return (
    <span
      role="img"
      aria-label={label ?? text}
      title={text}
      tabIndex={0}
      className={`inline-flex items-center justify-center text-zinc-600 hover:text-zinc-300 focus:text-zinc-300 focus:outline-none transition-colors cursor-help align-middle ${className ?? ''}`}
    >
      <HelpCircle className={size} aria-hidden="true" />
    </span>
  );
}

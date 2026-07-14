'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route error boundary in the house voice and tokens (both themes).
 * console.error is intentionally kept: compiler.removeConsole preserves
 * error/warn in production and this is the one place it belongs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center px-6">
      <div className="mx-auto w-full max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Runtime error · recorded like everything else
        </p>
        <h1 className="font-display mt-6 text-[clamp(2.25rem,6vw,3.75rem)] font-bold uppercase leading-[0.95] tracking-tight text-[var(--foreground)]">
          Something broke.
          <br />
          <span className="text-[var(--text-secondary)]">This one is fixable.</span>
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          An unexpected error stopped this page. Try again — and if it keeps
          failing, the source is open if you want to file an issue.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={reset}
            className="rounded-[var(--radius-pill)] bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-[var(--radius-pill)] border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--glass-border-accent)] hover:text-[var(--foreground)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

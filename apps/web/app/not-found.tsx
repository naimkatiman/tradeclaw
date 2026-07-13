import Link from 'next/link';
import { TradeClawLogo } from '../components/tradeclaw-logo';

/**
 * 404 in the house voice: the site's whole brand is honestly reporting
 * that something people look for isn't there. Token-driven (both themes),
 * display type per DESIGN.md; entrance uses the house fadeUp utilities,
 * which the blanket reduced-motion guard disables.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="animate-fade-up flex items-center gap-3">
          <TradeClawLogo className="h-8 w-8 shrink-0" id="tc-404" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            HTTP 404 · measured honestly
          </p>
        </div>
        <h1 className="font-display mt-6 text-[clamp(2.5rem,7vw,4.5rem)] font-bold uppercase leading-[0.95] tracking-tight text-[var(--foreground)]">
          <span className="animate-fade-up fade-delay-1 block">No edge found.</span>
          <span className="animate-fade-up fade-delay-2 block text-[var(--color-down)]">
            No page, either.
          </span>
        </h1>
        <p className="animate-fade-up fade-delay-3 mt-5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          The URL you tried doesn&apos;t resolve — much like the short-term
          trading edges we tested. Everything that does exist is free to check.
        </p>
        <div className="animate-fade-up fade-delay-4 mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-[var(--radius-pill)] bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            Back to the evidence
          </Link>
          <Link
            href="/research"
            className="rounded-[var(--radius-pill)] border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--glass-border-accent)] hover:text-[var(--foreground)]"
          >
            What we tested and killed
          </Link>
        </div>
      </div>
    </div>
  );
}

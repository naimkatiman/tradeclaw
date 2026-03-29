import Link from 'next/link';
import { HeroStats } from './hero-stats';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-16 text-center">
      {/* Background ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-emerald-500/6 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/4 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Eyebrow badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
          Open source — free forever
        </div>

        {/* Headline */}
<<<<<<< HEAD
        <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-white">
=======
        <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-[var(--foreground)]">
>>>>>>> origin/main
          Stop renting your
          <br />
          <span className="text-emerald-400 text-glow-emerald">trading edge.</span>
        </h1>

        {/* Subheadline */}
<<<<<<< HEAD
        <p className="mx-auto mt-6 max-w-xl text-base text-zinc-400 leading-relaxed sm:text-lg">
=======
        <p className="mx-auto mt-6 max-w-xl text-base text-[var(--text-secondary)] leading-relaxed sm:text-lg">
>>>>>>> origin/main
          AI-powered trading signals for forex, crypto, and metals.
          Self-hosted, private, and free — no subscription, no lock-in.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all duration-300 hover:bg-zinc-100 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
          <Link
            href="/dashboard"
<<<<<<< HEAD
            className="flex items-center gap-2 rounded-full border border-white/10 px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 active:scale-[0.98]"
=======
            className="flex items-center gap-2 rounded-full border border-[var(--border)] px-7 py-3 text-sm font-semibold text-[var(--foreground)] transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 active:scale-[0.98]"
>>>>>>> origin/main
          >
            View live signals
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* GitHub stars + signal count */}
        <HeroStats />

        {/* Trust signals */}
<<<<<<< HEAD
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-600">
=======
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-[var(--text-secondary)]">
>>>>>>> origin/main
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/></svg>
            Open source
          </span>
<<<<<<< HEAD
          <span className="h-px w-3 bg-zinc-800 rotate-90 sm:rotate-0" />
=======
          <span className="h-px w-3 bg-[var(--border)] rotate-90 sm:rotate-0" />
>>>>>>> origin/main
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1"/><path d="M4 3V2a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1"/></svg>
            Self-hosted
          </span>
<<<<<<< HEAD
          <span className="h-px w-3 bg-zinc-800 rotate-90 sm:rotate-0" />
=======
          <span className="h-px w-3 bg-[var(--border)] rotate-90 sm:rotate-0" />
>>>>>>> origin/main
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1"/><path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
            12+ symbols
          </span>
<<<<<<< HEAD
          <span className="h-px w-3 bg-zinc-800 rotate-90 sm:rotate-0" />
=======
          <span className="h-px w-3 bg-[var(--border)] rotate-90 sm:rotate-0" />
>>>>>>> origin/main
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 9L4.5 5.5l2.5 2 4-5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
            M5 to D1 signals
          </span>
        </div>
      </div>

      {/* Dashboard preview */}
      <div className="relative z-10 mx-auto mt-16 w-full max-w-5xl px-4">
<<<<<<< HEAD
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#080808] shadow-2xl shadow-black/60">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 bg-[#0a0a0a]">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-3 text-xs text-zinc-700 font-mono">
=======
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl shadow-black/20">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 bg-[var(--bg-card)]">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-3 text-xs text-[var(--text-secondary)] font-mono">
>>>>>>> origin/main
              tradeclaw — signal dashboard
            </span>
          </div>
          {/* Mock dashboard */}
<<<<<<< HEAD
          <div className="p-6 bg-gradient-to-br from-[#080808] to-[#050505]">
=======
          <div className="p-6 bg-[var(--background)]">
>>>>>>> origin/main
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-3">
                <MockSignalCard symbol="XAU/USD" direction="BUY" confidence={87} price="2,648.30" />
                <MockSignalCard symbol="BTC/USD" direction="SELL" confidence={74} price="94,210.50" />
                <MockSignalCard symbol="EUR/USD" direction="BUY" confidence={81} price="1.0832" />
              </div>
<<<<<<< HEAD
              <div className="col-span-2 rounded-xl border border-white/5 bg-white/[0.015] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs font-mono text-zinc-600 uppercase tracking-wider mb-2">Multi-timeframe confluence</div>
                  <div className="flex gap-2 justify-center">
                    {['M5', 'M15', 'H1', 'H4', 'D1'].map((tf, i) => (
                      <div key={tf} className="text-center">
                        <div className="text-[9px] text-zinc-600 mb-1">{tf}</div>
=======
              <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">Multi-timeframe confluence</div>
                  <div className="flex gap-2 justify-center">
                    {['M5', 'M15', 'H1', 'H4', 'D1'].map((tf, i) => (
                      <div key={tf} className="text-center">
                        <div className="text-[9px] text-[var(--text-secondary)] mb-1">{tf}</div>
>>>>>>> origin/main
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          [true, true, true, false, true][i]
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>
                          {[true, true, true, false, true][i] ? 'B' : 'S'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade */}
<<<<<<< HEAD
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
=======
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
>>>>>>> origin/main
    </section>
  );
}

function MockSignalCard({
  symbol,
  direction,
  confidence,
  price,
}: {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  price: string;
}) {
  const isBuy = direction === 'BUY';
  return (
<<<<<<< HEAD
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white font-mono">{symbol}</span>
=======
    <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--foreground)] font-mono">{symbol}</span>
>>>>>>> origin/main
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
          isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {direction}
        </span>
      </div>
<<<<<<< HEAD
      <div className="text-sm font-mono text-zinc-300 mb-2">{price}</div>
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 flex-1 rounded-full bg-white/5">
=======
      <div className="text-sm font-mono text-[var(--foreground)] mb-2">{price}</div>
      <div className="flex items-center gap-1.5">
        <div className="h-0.5 flex-1 rounded-full bg-[var(--border)]">
>>>>>>> origin/main
          <div
            className={`h-0.5 rounded-full transition-all duration-700 ${isBuy ? 'bg-emerald-400' : 'bg-red-400'}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
<<<<<<< HEAD
        <span className="text-[10px] font-mono text-zinc-600">{confidence}%</span>
=======
        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{confidence}%</span>
>>>>>>> origin/main
      </div>
    </div>
  );
}

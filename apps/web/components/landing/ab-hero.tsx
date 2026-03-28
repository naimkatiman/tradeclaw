"use client";

/**
 * A/B Hero — 3 variants testing different value props
 * Variant assignment: localStorage "tc_ab_variant" (a/b/c)
 * Click tracking: localStorage "tc_ab_clicks" { a: 0, b: 0, c: 0 }
 * Stats visible at /ab-stats (dev) or via window.__tcABStats()
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatedChartHero } from "../animated-chart-hero";

const GITHUB_URL = "https://github.com/naimkatiman/tradeclaw";

const SIGNALS = [
  { symbol: "XAU/USD", direction: "BUY" as const, confidence: 87, price: "2,648.30" },
  { symbol: "BTC/USD", direction: "SELL" as const, confidence: 74, price: "94,210.50" },
  { symbol: "EUR/USD", direction: "BUY" as const, confidence: 81, price: "1.0832" },
  { symbol: "GBP/JPY", direction: "SELL" as const, confidence: 68, price: "191.540" },
  { symbol: "ETH/USD", direction: "BUY" as const, confidence: 79, price: "3,412.80" },
  { symbol: "OIL/USD", direction: "SELL" as const, confidence: 72, price: "78.340" },
];
const TICKER_SIGNALS = [...SIGNALS, ...SIGNALS];

type Variant = "a" | "b" | "c";

interface ABStats {
  impressions: Record<Variant, number>;
  clicks: Record<Variant, number>;
}

const VARIANTS: Variant[] = ["a", "b", "c"];

function assignVariant(): Variant {
  if (typeof window === "undefined") return "a";
  const stored = localStorage.getItem("tc_ab_variant") as Variant | null;
  if (stored && VARIANTS.includes(stored)) return stored;
  // Random weighted assignment
  const v = VARIANTS[Math.floor(Math.random() * 3)];
  localStorage.setItem("tc_ab_variant", v);
  return v;
}

function trackImpression(v: Variant) {
  try {
    const raw = localStorage.getItem("tc_ab_impressions");
    const counts: Record<Variant, number> = raw ? JSON.parse(raw) : { a: 0, b: 0, c: 0 };
    counts[v] = (counts[v] || 0) + 1;
    localStorage.setItem("tc_ab_impressions", JSON.stringify(counts));
  } catch {}
}

function trackClick(v: Variant) {
  try {
    const raw = localStorage.getItem("tc_ab_clicks");
    const counts: Record<Variant, number> = raw ? JSON.parse(raw) : { a: 0, b: 0, c: 0 };
    counts[v] = (counts[v] || 0) + 1;
    localStorage.setItem("tc_ab_clicks", JSON.stringify(counts));
  } catch {}
}

function SignalPill({
  symbol,
  direction,
  confidence,
  price,
}: {
  symbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  price: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-xs whitespace-nowrap">
      <span className="font-mono font-medium text-white">{symbol}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
          direction === "BUY"
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-rose-500/20 text-rose-400"
        }`}
      >
        {direction}
      </span>
      <span className="text-zinc-500">{confidence}%</span>
      <span className="font-mono text-zinc-400">{price}</span>
    </div>
  );
}

/* ─── Variant A: Original — "AI Trading Signals. Open Source. Self-Hosted." ─── */
function HeroVariantA({
  stars,
  onGitHubClick,
}: {
  stars: number | null;
  onGitHubClick: () => void;
}) {
  return (
    <div className="relative z-10 mx-auto max-w-4xl">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/3 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Variant A
        </span>
      </div>
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Open Source · Self-Hosted · AI-Powered
      </div>

      <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-white">
        AI Trading Signals.
        <br />
        <span className="text-emerald-400" style={{ textShadow: "0 0 40px rgba(52,211,153,0.4)" }}>
          Open Source.
        </span>{" "}
        Self-Hosted.
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 leading-relaxed sm:text-lg">
        Real-time BUY/SELL signals for forex, crypto, and commodities.
        Self-hosted, private, and free — no subscription, no lock-in, no data
        sent to third parties.
      </p>

      <div className="relative mt-10 overflow-hidden rounded-xl border border-white/8 bg-[#0a0a0a]">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Live signal feed</span>
        </div>
        <div className="overflow-hidden py-3">
          <div className="flex gap-3 w-max" style={{ animation: "ticker 30s linear infinite" }}>
            {TICKER_SIGNALS.map((sig, i) => <SignalPill key={i} {...sig} />)}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a
          href="#deploy"
          className="group flex items-center gap-2.5 rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          Deploy Free in 30s
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onGitHubClick}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-7 py-3 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
            <path d="M7.5.25A7.25 7.25 0 0 0 .25 7.5c0 3.2 2.07 5.91 4.94 6.87.36.07.49-.16.49-.35v-1.22c-2 .43-2.42-.97-2.42-.97-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.46.25-.78.45-.96-1.59-.18-3.26-.8-3.26-3.55 0-.78.28-1.42.74-1.92-.07-.18-.32-.91.07-1.9 0 0 .6-.19 1.98.74a6.9 6.9 0 0 1 1.8-.24c.61 0 1.22.08 1.8.24 1.37-.93 1.97-.74 1.97-.74.39.99.14 1.72.07 1.9.46.5.74 1.14.74 1.92 0 2.76-1.68 3.37-3.27 3.55.26.22.49.66.49 1.33v1.97c0 .19.13.42.5.35A7.25 7.25 0 0 0 14.75 7.5 7.25 7.25 0 0 0 7.5.25Z" />
          </svg>
          {stars !== null ? `⭐ ${stars} Stars` : "Star on GitHub"}
        </a>
      </div>
    </div>
  );
}

/* ─── Variant B: Developer-first — "Stop writing indicator code. Get signals." ─── */
function HeroVariantB({
  stars,
  onGitHubClick,
}: {
  stars: number | null;
  onGitHubClick: () => void;
}) {
  return (
    <div className="relative z-10 mx-auto max-w-4xl">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/3 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
        <span className="inline-flex items-center gap-1 text-purple-400">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          Variant B
        </span>
      </div>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/8 px-4 py-1.5 text-xs font-mono font-medium text-purple-400">
        npx tradeclaw signals --pair BTCUSD
      </div>

      <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-white">
        Stop writing
        <br />
        <span className="text-purple-400" style={{ textShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
          indicator code.
        </span>
        <br />
        Get signals.
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 leading-relaxed sm:text-lg">
        TradeClaw runs RSI, MACD, EMA confluence and returns a decision — BUY,
        SELL, confidence %, entry, SL, TP. REST API, Docker, MIT license. No
        cloud dependency. Ship in minutes.
      </p>

      {/* Code snippet */}
      <div className="mt-8 overflow-hidden rounded-xl border border-white/8 bg-[#0a0a0a] text-left">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-rose-500/60" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
          <span className="ml-2 text-[10px] font-mono text-zinc-600">terminal</span>
        </div>
        <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto">
          <span className="text-zinc-600">$</span>
          <span className="text-white"> curl </span>
          <span className="text-emerald-400">https://tradeclaw.win/api/v1/signals?pair=BTCUSD</span>
          {"\n"}
          {"\n"}
          <span className="text-zinc-500">{"{"}</span>
          {"\n"}
          <span className="text-zinc-500">{"  "}</span>
          <span className="text-purple-400">&quot;direction&quot;</span>
          <span className="text-zinc-500">: </span>
          <span className="text-emerald-400">&quot;BUY&quot;</span>
          <span className="text-zinc-500">,</span>
          {"\n"}
          <span className="text-zinc-500">{"  "}</span>
          <span className="text-purple-400">&quot;confidence&quot;</span>
          <span className="text-zinc-500">: </span>
          <span className="text-yellow-400">82</span>
          <span className="text-zinc-500">,</span>
          {"\n"}
          <span className="text-zinc-500">{"  "}</span>
          <span className="text-purple-400">&quot;entry&quot;</span>
          <span className="text-zinc-500">: </span>
          <span className="text-white">94210.50</span>
          <span className="text-zinc-500">,</span>
          {"\n"}
          <span className="text-zinc-500">{"  "}</span>
          <span className="text-purple-400">&quot;stopLoss&quot;</span>
          <span className="text-zinc-500">: </span>
          <span className="text-rose-400">93580.00</span>
          {"\n"}
          <span className="text-zinc-500">{"}"}</span>
        </pre>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/api-docs"
          className="group flex items-center gap-2.5 rounded-full bg-purple-500 px-7 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          View API Docs
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onGitHubClick}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-7 py-3 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
            <path d="M7.5.25A7.25 7.25 0 0 0 .25 7.5c0 3.2 2.07 5.91 4.94 6.87.36.07.49-.16.49-.35v-1.22c-2 .43-2.42-.97-2.42-.97-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.46.25-.78.45-.96-1.59-.18-3.26-.8-3.26-3.55 0-.78.28-1.42.74-1.92-.07-.18-.32-.91.07-1.9 0 0 .6-.19 1.98.74a6.9 6.9 0 0 1 1.8-.24c.61 0 1.22.08 1.8.24 1.37-.93 1.97-.74 1.97-.74.39.99.14 1.72.07 1.9.46.5.74 1.14.74 1.92 0 2.76-1.68 3.37-3.27 3.55.26.22.49.66.49 1.33v1.97c0 .19.13.42.5.35A7.25 7.25 0 0 0 14.75 7.5 7.25 7.25 0 0 0 7.5.25Z" />
          </svg>
          {stars !== null ? `⭐ ${stars} Stars` : "Star on GitHub"}
        </a>
      </div>
    </div>
  );
}

/* ─── Variant C: Trader-first — "Know what to trade. Right now." ─── */
function HeroVariantC({
  stars,
  onGitHubClick,
}: {
  stars: number | null;
  onGitHubClick: () => void;
}) {
  return (
    <div className="relative z-10 mx-auto max-w-4xl">
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/3 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400">
        <span className="inline-flex items-center gap-1 text-yellow-400">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Variant C
        </span>
      </div>
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/8 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-yellow-400">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
        Free · Self-Hosted · 10 Assets · Live Now
      </div>

      <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-white">
        Know what to trade.
        <br />
        <span className="text-yellow-400" style={{ textShadow: "0 0 40px rgba(234,179,8,0.4)" }}>
          Right now.
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 leading-relaxed sm:text-lg">
        TradeClaw analyzes 10 assets across forex, crypto, and commodities —
        and tells you BUY, SELL, or wait. Live signals, confidence scores, and
        full indicator breakdown. Install it in your own environment. Free forever.
      </p>

      {/* Live signal cards */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SIGNALS.slice(0, 6).map((sig) => (
          <div
            key={sig.symbol}
            className={`rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[1.02] ${
              sig.direction === "BUY"
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-rose-500/20 bg-rose-500/5"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-white">{sig.symbol}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  sig.direction === "BUY"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {sig.direction}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">Confidence</div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${
                  sig.direction === "BUY" ? "bg-emerald-400" : "bg-rose-400"
                }`}
                style={{ width: `${sig.confidence}%` }}
              />
            </div>
            <div className="mt-1 text-xs font-semibold text-zinc-300">{sig.confidence}%</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5 rounded-full bg-yellow-500 px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-yellow-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          See Live Signals
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
            <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onGitHubClick}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-7 py-3 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
            <path d="M7.5.25A7.25 7.25 0 0 0 .25 7.5c0 3.2 2.07 5.91 4.94 6.87.36.07.49-.16.49-.35v-1.22c-2 .43-2.42-.97-2.42-.97-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.46.25-.78.45-.96-1.59-.18-3.26-.8-3.26-3.55 0-.78.28-1.42.74-1.92-.07-.18-.32-.91.07-1.9 0 0 .6-.19 1.98.74a6.9 6.9 0 0 1 1.8-.24c.61 0 1.22.08 1.8.24 1.37-.93 1.97-.74 1.97-.74.39.99.14 1.72.07 1.9.46.5.74 1.14.74 1.92 0 2.76-1.68 3.37-3.27 3.55.26.22.49.66.49 1.33v1.97c0 .19.13.42.5.35A7.25 7.25 0 0 0 14.75 7.5 7.25 7.25 0 0 0 7.5.25Z" />
          </svg>
          {stars !== null ? `⭐ ${stars} Stars` : "Star on GitHub"}
        </a>
      </div>
    </div>
  );
}

/* ─── Main export ─── */
export function ABHero() {
  const [variant, setVariant] = useState<Variant>("a");
  const [stars, setStars] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const v = assignVariant();
    setVariant(v);
    trackImpression(v);
    setMounted(true);

    // Expose stats to devtools
    (window as unknown as { __tcABStats: () => ABStats }).__tcABStats = () => {
      const impressions: Record<string, number> = JSON.parse(
        localStorage.getItem("tc_ab_impressions") || '{"a":0,"b":0,"c":0}'
      );
      const clicks: Record<string, number> = JSON.parse(
        localStorage.getItem("tc_ab_clicks") || '{"a":0,"b":0,"c":0}'
      );
      return { impressions, clicks } as ABStats;
    };

    fetch("https://api.github.com/repos/naimkatiman/tradeclaw")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (d && typeof d === "object" && "stargazers_count" in d) {
          setStars((d as { stargazers_count: number }).stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  const handleGitHubClick = useCallback(() => {
    trackClick(variant);
  }, [variant]);

  if (!mounted) {
    return (
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-16 text-center">
        <div className="h-96 w-full animate-pulse rounded-xl bg-white/3" />
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-16 text-center">
      <AnimatedChartHero className="absolute inset-0 w-full h-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-transparent to-[#050505]/80" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[140px]" />
      </div>

      {variant === "a" && <HeroVariantA stars={stars} onGitHubClick={handleGitHubClick} />}
      {variant === "b" && <HeroVariantB stars={stars} onGitHubClick={handleGitHubClick} />}
      {variant === "c" && <HeroVariantC stars={stars} onGitHubClick={handleGitHubClick} />}
    </section>
  );
}

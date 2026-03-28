"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const GITHUB_URL = "https://github.com/naimkatiman/tradeclaw";

const SIGNALS = [
  { symbol: "XAU/USD", direction: "BUY" as const, confidence: 87, price: "2,648.30" },
  { symbol: "BTC/USD", direction: "SELL" as const, confidence: 74, price: "94,210.50" },
  { symbol: "EUR/USD", direction: "BUY" as const, confidence: 81, price: "1.0832" },
  { symbol: "GBP/JPY", direction: "SELL" as const, confidence: 68, price: "191.540" },
  { symbol: "ETH/USD", direction: "BUY" as const, confidence: 79, price: "3,412.80" },
  { symbol: "OIL/USD", direction: "SELL" as const, confidence: 72, price: "78.340" },
  { symbol: "SOL/USD", direction: "BUY" as const, confidence: 83, price: "182.60" },
  { symbol: "NAS100", direction: "BUY" as const, confidence: 76, price: "21,840" },
];

// Duplicate for seamless CSS loop
const TICKER_SIGNALS = [...SIGNALS, ...SIGNALS];

export function AnimatedHero() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/naimkatiman/tradeclaw")
      .then((r) => r.json())
      .then((d: unknown) => {
        if (
          d &&
          typeof d === "object" &&
          "stargazers_count" in d &&
          typeof (d as Record<string, unknown>).stargazers_count === "number"
        ) {
          setStars((d as { stargazers_count: number }).stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-16 text-center">
      {/* Grid dot background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--hero-grid-dot) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-emerald-500/5 blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/3 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Eyebrow badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
          Open Source · Self-Hosted · AI-Powered
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-[var(--foreground)]">
          AI Trading Signals.
          <br />
          <span className="text-emerald-400 text-glow-emerald">
            Open Source.
          </span>{" "}
          Self-Hosted.
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--text-secondary)] leading-relaxed sm:text-lg">
          Real-time BUY/SELL signals for forex, crypto, and commodities.
          Self-hosted, private, and free — no subscription, no lock-in, no
          data sent to third parties.
        </p>

        {/* Live signal ticker */}
        <div className="relative mt-10 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)]">
              Live signal feed
            </span>
          </div>
          <div className="overflow-hidden py-3">
            <div className="ticker-scroll flex gap-3 w-max">
              {TICKER_SIGNALS.map((sig, i) => (
                <SignalPill key={i} {...sig} />
              ))}
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="#deploy"
            className="group flex items-center gap-2.5 rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              className="opacity-80"
            >
              <path
                d="M7.5 1v13M1 7.5h13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Deploy Now
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-full border border-[var(--border)] px-7 py-3 text-sm font-semibold text-[var(--foreground)] transition-all duration-200 hover:border-[var(--glass-border-accent)] hover:bg-[var(--glass-bg)] active:scale-[0.98]"
          >
            <GitHubIcon />
            View on GitHub
            {stars !== null && (
              <span className="ml-0.5 rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] font-mono tabular-nums text-[var(--text-secondary)]">
                {stars.toLocaleString()}
              </span>
            )}
          </a>
        </div>

        {/* Trust badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-secondary)]">
          {[
            "MIT License",
            "12+ asset pairs",
            "M5 to D1 timeframes",
            "Docker ready",
            "No data lock-in",
          ].map((badge, i, arr) => (
            <span key={badge} className="flex items-center gap-2">
              <span>{badge}</span>
              {i < arr.length - 1 && (
                <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
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
  const isBuy = direction === "BUY";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] px-3.5 py-2.5 shrink-0">
      <span className="text-xs font-mono font-semibold text-[var(--foreground)]">
        {symbol}
      </span>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
          isBuy
            ? "bg-emerald-500/12 text-emerald-400"
            : "bg-rose-500/12 text-rose-400"
        }`}
      >
        {direction}
      </span>
      <span className="text-[10px] font-mono text-[var(--text-secondary)]">{price}</span>
      <div className="flex items-center gap-1">
        <div className="h-0.5 w-12 rounded-full bg-[var(--border)]">
          <div
            className={`h-0.5 rounded-full ${isBuy ? "bg-emerald-400" : "bg-rose-400"}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-[var(--text-secondary)]">
          {confidence}%
        </span>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

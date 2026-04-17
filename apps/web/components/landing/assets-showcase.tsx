"use client";

import { useEffect, useRef, useState } from "react";

interface AssetGroup {
  category: string;
  color: string;
  pairs: string[];
}

const ASSET_GROUPS: AssetGroup[] = [
  {
    category: "Crypto",
    color: "emerald",
    pairs: [
      "BTC/USD",
      "ETH/USD",
      "SOL/USD",
      "BNB/USD",
      "XRP/USD",
      "ADA/USD",
    ],
  },
  {
    category: "Forex",
    color: "sky",
    pairs: [
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "GBP/JPY",
      "AUD/USD",
      "USD/CAD",
    ],
  },
  {
    category: "Commodities",
    color: "amber",
    pairs: ["XAU/USD", "XAG/USD", "OIL/USD", "NAT/GAS"],
  },
];

const COLOR_MAP: Record<string, { badge: string; text: string; dot: string }> =
  {
    emerald: {
      badge:
        "border-emerald-500/20 bg-emerald-500/6 text-emerald-600 dark:text-emerald-300 hover:border-emerald-500/40",
      text: "text-emerald-500 dark:text-emerald-400",
      dot: "bg-emerald-400",
    },
    sky: {
      badge:
        "border-sky-500/20 bg-sky-500/6 text-sky-600 dark:text-sky-300 hover:border-sky-500/40",
      text: "text-sky-500 dark:text-sky-400",
      dot: "bg-sky-400",
    },
    amber: {
      badge:
        "border-amber-500/20 bg-amber-500/6 text-amber-600 dark:text-amber-300 hover:border-amber-500/40",
      text: "text-amber-500 dark:text-amber-400",
      dot: "bg-amber-400",
    },
  };

export function AssetsShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="px-6 py-24 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            Supported assets
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)]">
            12+ pairs across{" "}
            <span className="text-emerald-400">every market</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-[var(--text-secondary)]">
            AI signals for crypto, major forex pairs, and precious metals —
            all in one dashboard.
          </p>
        </div>

        <div ref={containerRef} className="space-y-8">
          {ASSET_GROUPS.map((group) => {
            const colors = COLOR_MAP[group.color];
            return (
              <div key={group.category}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                  <span
                    className={`text-xs font-semibold uppercase tracking-widest ${colors.text}`}
                  >
                    {group.category}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.pairs.map((pair, i) => (
                    <span
                      key={pair}
                      className={`rounded-lg border px-3.5 py-1.5 text-xs font-mono font-medium transition-all duration-300 ${colors.badge} stagger-item ${visible ? "visible" : ""}`}
                      style={{
                        transitionDelay: visible ? `${i * 60}ms` : "0ms",
                      }}
                    >
                      {pair}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Variant = "a" | "b" | "c";
const VARIANTS: Variant[] = ["a", "b", "c"];

const VARIANT_NAMES: Record<Variant, string> = {
  a: 'Variant A — "AI Trading Signals. Open Source. Self-Hosted."',
  b: 'Variant B — "Stop writing indicator code. Get signals."',
  c: 'Variant C — "Know what to trade. Right now."',
};

const VARIANT_COLORS: Record<Variant, string> = {
  a: "emerald",
  b: "purple",
  c: "yellow",
};

export function ABStatsClient() {
  const [impressions, setImpressions] = useState<Record<Variant, number>>({ a: 0, b: 0, c: 0 });
  const [clicks, setClicks] = useState<Record<Variant, number>>({ a: 0, b: 0, c: 0 });
  const [myVariant, setMyVariant] = useState<Variant | null>(null);

  useEffect(() => {
    const imp = JSON.parse(localStorage.getItem("tc_ab_impressions") || '{"a":0,"b":0,"c":0}');
    const clk = JSON.parse(localStorage.getItem("tc_ab_clicks") || '{"a":0,"b":0,"c":0}');
    const v = localStorage.getItem("tc_ab_variant") as Variant | null;
    setTimeout(() => {
      setImpressions(imp);
      setClicks(clk);
      setMyVariant(v);
    }, 0);
  }, []);

  const totalImpressions = VARIANTS.reduce((s, v) => s + (impressions[v] || 0), 0);
  const totalClicks = VARIANTS.reduce((s, v) => s + (clicks[v] || 0), 0);

  function resetStats() {
    localStorage.removeItem("tc_ab_impressions");
    localStorage.removeItem("tc_ab_clicks");
    localStorage.removeItem("tc_ab_variant");
    setImpressions({ a: 0, b: 0, c: 0 });
    setClicks({ a: 0, b: 0, c: 0 });
    setMyVariant(null);
  }

  function forceVariant(v: Variant) {
    localStorage.setItem("tc_ab_variant", v);
    setMyVariant(v);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 text-xs font-mono uppercase tracking-widest text-zinc-600">
          A/B Test Dashboard
        </div>
        <h1 className="mb-2 text-3xl font-bold">Hero Variant Stats</h1>
        <p className="mb-10 text-sm text-zinc-500">
          Tracking impressions and GitHub CTA clicks per hero variant (localStorage only — single browser).
          {myVariant && (
            <span className="ml-2 text-emerald-400">
              Your variant: <strong>{myVariant.toUpperCase()}</strong>
            </span>
          )}
        </p>

        {/* Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <div className="text-xs text-zinc-500 mb-1">Total Impressions</div>
            <div className="text-2xl font-bold">{totalImpressions}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <div className="text-xs text-zinc-500 mb-1">Total GitHub Clicks</div>
            <div className="text-2xl font-bold">{totalClicks}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <div className="text-xs text-zinc-500 mb-1">Overall CTR</div>
            <div className="text-2xl font-bold">
              {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0"}%
            </div>
          </div>
        </div>

        {/* Per-variant */}
        <div className="space-y-4 mb-10">
          {VARIANTS.map((v) => {
            const imp = impressions[v] || 0;
            const clk = clicks[v] || 0;
            const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(1) : "0.0";
            const color = VARIANT_COLORS[v];
            const isWinner =
              totalClicks > 0 &&
              clk === Math.max(...VARIANTS.map((x) => clicks[x] || 0)) &&
              clk > 0;

            return (
              <div
                key={v}
                className={`rounded-xl border p-5 ${
                  myVariant === v
                    ? "border-white/20 bg-white/5"
                    : "border-white/8 bg-white/2"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider text-${color}-400`}
                      >
                        Variant {v.toUpperCase()}
                      </span>
                      {isWinner && (
                        <span className="rounded bg-zinc-500/20 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                          WINNING
                        </span>
                      )}
                      {myVariant === v && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">{VARIANT_NAMES[v]}</div>
                  </div>
                  <button
                    onClick={() => forceVariant(v)}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 border border-white/8 rounded px-2 py-1 transition-colors"
                  >
                    Force this variant
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] text-zinc-600 mb-0.5">Impressions</div>
                    <div className="text-lg font-semibold">{imp}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-600 mb-0.5">GitHub Clicks</div>
                    <div className="text-lg font-semibold">{clk}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-600 mb-0.5">CTR</div>
                    <div className={`text-lg font-semibold text-${color}-400`}>{ctr}%</div>
                  </div>
                </div>

                {/* CTR bar */}
                <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full bg-${color}-400 transition-all duration-700`}
                    style={{ width: `${Math.min(parseFloat(ctr) * 5, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={resetStats}
            className="rounded-lg border border-rose-500/20 bg-rose-500/8 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/15 transition-colors"
          >
            Reset All Stats
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-white/4 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Back to Homepage
          </Link>
        </div>

        <p className="mt-6 text-xs text-zinc-700">
          Note: Stats are stored in this browser&apos;s localStorage only. Not shared across devices.
          Use &quot;Force this variant&quot; to preview a specific hero on the homepage.
          Open browser console and call <code className="text-zinc-500">window.__tcABStats()</code> for raw data.
        </p>
      </div>
    </div>
  );
}

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

// Minimum impressions PER VARIANT before a CTR is meaningful enough to show a
// "leading" marker. A single click on N=1 is noise, not a result; this is a
// sample-size floor, not a statistical significance test (single-browser
// localStorage data can never support one).
const MIN_IMPRESSIONS = 30;

export function ABStatsClient() {
  const [impressions, setImpressions] = useState<Record<Variant, number>>({ a: 0, b: 0, c: 0 });
  const [clicks, setClicks] = useState<Record<Variant, number>>({ a: 0, b: 0, c: 0 });
  const [myVariant, setMyVariant] = useState<Variant | null>(null);
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    const imp = JSON.parse(localStorage.getItem("tc_ab_impressions") || '{"a":0,"b":0,"c":0}');
    const clk = JSON.parse(localStorage.getItem("tc_ab_clicks") || '{"a":0,"b":0,"c":0}');
    const v = localStorage.getItem("tc_ab_variant") as Variant | null;
    const sinceRaw = localStorage.getItem("tc_ab_since");
    setTimeout(() => {
      setImpressions(imp);
      setClicks(clk);
      setMyVariant(v);
      setSince(sinceRaw);
    }, 0);
  }, []);

  const totalImpressions = VARIANTS.reduce((s, v) => s + (impressions[v] || 0), 0);
  const totalClicks = VARIANTS.reduce((s, v) => s + (clicks[v] || 0), 0);
  const sinceLabel = since
    ? new Date(since).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  // Overall CTR is only meaningful once enough impressions have accrued.
  const overallSufficient = totalImpressions >= MIN_IMPRESSIONS;

  function resetStats() {
    localStorage.removeItem("tc_ab_impressions");
    localStorage.removeItem("tc_ab_clicks");
    localStorage.removeItem("tc_ab_variant");
    localStorage.removeItem("tc_ab_since");
    setImpressions({ a: 0, b: 0, c: 0 });
    setClicks({ a: 0, b: 0, c: 0 });
    setMyVariant(null);
    setSince(null);
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
        <p className="mb-3 text-sm text-zinc-500">
          Tracking impressions and GitHub CTA clicks per hero variant
          {sinceLabel ? <> since <span className="text-zinc-300">{sinceLabel}</span></> : null}
          {" "}(localStorage only — single browser).
          {myVariant && (
            <span className="ml-2 text-emerald-400">
              Your variant: <strong>{myVariant.toUpperCase()}</strong>
            </span>
          )}
        </p>
        <p className="mb-10 inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/25">
          Single-browser sample, not a controlled experiment. No statistical
          significance test — a &ldquo;leading&rdquo; marker requires only{" "}
          {MIN_IMPRESSIONS}+ impressions on each variant and does not prove a real difference.
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
            {overallSufficient ? (
              <>
                <div className="text-2xl font-bold">
                  {((totalClicks / totalImpressions) * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] font-mono text-zinc-600 mt-0.5">
                  {totalClicks}/{totalImpressions} clicks/impr
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-zinc-600">—</div>
                <div className="text-[10px] font-mono text-amber-400/80 mt-0.5">
                  n={totalImpressions} &lt; {MIN_IMPRESSIONS} · too few impressions
                </div>
              </>
            )}
          </div>
        </div>

        {/* Per-variant */}
        <div className="space-y-4 mb-10">
          {VARIANTS.map((v) => {
            const imp = impressions[v] || 0;
            const clk = clicks[v] || 0;
            const ctrSufficient = imp >= MIN_IMPRESSIONS;
            const ctrNum = imp > 0 ? (clk / imp) * 100 : 0;
            const ctr = ctrNum.toFixed(1);
            const color = VARIANT_COLORS[v];
            // "Leading" — not "winning". Only mark a leader once EVERY variant
            // has cleared the impression floor (so the comparison is on
            // comparable samples) and this variant has the strictly highest
            // CTR. Ties and thin samples get no marker. This is not a
            // significance test.
            const allCleared = VARIANTS.every((x) => (impressions[x] || 0) >= MIN_IMPRESSIONS);
            const variantCtr = (x: Variant) =>
              (impressions[x] || 0) > 0 ? (clicks[x] || 0) / (impressions[x] || 0) : 0;
            const myCtr = variantCtr(v);
            const bestCtr = Math.max(...VARIANTS.map(variantCtr));
            const isUniqueBest =
              VARIANTS.filter((x) => variantCtr(x) === bestCtr).length === 1;
            const isLeading = allCleared && myCtr > 0 && myCtr === bestCtr && isUniqueBest;

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
                      {isLeading && (
                        <span
                          className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/25"
                          title={`Highest CTR with every variant past ${MIN_IMPRESSIONS}+ impressions. Not a significance test.`}
                        >
                          LEADING
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
                    <div className="text-[10px] font-mono text-zinc-600 mt-0.5">{clk}/{imp}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-600 mb-0.5">CTR</div>
                    {ctrSufficient ? (
                      <div className={`text-lg font-semibold text-${color}-400`}>{ctr}%</div>
                    ) : (
                      <>
                        <div className="text-lg font-semibold text-zinc-600">—</div>
                        <div className="text-[10px] font-mono text-amber-400/80 mt-0.5">
                          n={imp} &lt; {MIN_IMPRESSIONS}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* CTR bar — only drawn once the variant clears the floor */}
                {ctrSufficient && (
                  <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full bg-${color}-400 transition-all duration-700`}
                      style={{ width: `${Math.min(ctrNum * 5, 100)}%` }}
                    />
                  </div>
                )}
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

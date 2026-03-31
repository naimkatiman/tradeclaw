"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, DollarSign, BarChart3, Calculator, GitBranch, Copy, Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TabKey = "rsi" | "position" | "rr" | "pip" | "fib";

interface Tab {
  key: TabKey;
  label: string;
  icon: typeof TrendingUp;
}

const TABS: Tab[] = [
  { key: "rsi", label: "RSI", icon: TrendingUp },
  { key: "position", label: "Position", icon: DollarSign },
  { key: "rr", label: "R:R", icon: BarChart3 },
  { key: "pip", label: "Pip", icon: Calculator },
  { key: "fib", label: "Fibonacci", icon: GitBranch },
];

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function ShareButton({ params }: { params: Record<string, string> }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors mt-4"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

function InputField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <input
        {...props}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
      />
    </label>
  );
}

function ResultCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-lg font-semibold text-white">{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: "emerald" | "rose" | "zinc" | "amber" | "red" }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rose: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    zinc: "bg-zinc-700/40 text-zinc-300 border-zinc-600/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  RSI Calculator                                                     */
/* ------------------------------------------------------------------ */

function RSITab() {
  const [prices, setPrices] = useState("44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.15, 43.61, 44.33, 44.83, 45.10, 45.15, 43.61");
  const [period, setPeriod] = useState(14);

  const result = (() => {
    const nums = prices.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
    if (nums.length < period + 1) return null;

    const deltas = nums.slice(1).map((v, i) => v - nums[i]);
    const gains = deltas.map((d) => (d > 0 ? d : 0));
    const losses = deltas.map((d) => (d < 0 ? Math.abs(d) : 0));

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) return { rsi: 100 };
    const rs = avgGain / avgLoss;
    return { rsi: 100 - 100 / (1 + rs) };
  })();

  const rsi = result?.rsi;
  const badge = rsi == null ? null : rsi >= 70 ? { text: "Overbought", color: "rose" as const } : rsi <= 30 ? { text: "Oversold", color: "emerald" as const } : { text: "Neutral", color: "zinc" as const };

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-400">Closing Prices (comma-separated)</span>
        <textarea
          value={prices}
          onChange={(e) => setPrices(e.target.value)}
          rows={3}
          placeholder="44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.15, 43.61, 44.33, 44.83, 45.10, 45.15, 43.61"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors resize-none"
        />
      </label>
      <InputField
        label="Period"
        type="number"
        min={2}
        max={50}
        value={period}
        onChange={(e) => setPeriod(Number(e.target.value))}
      />
      {rsi != null && (
        <div className="bg-zinc-800/50 rounded-lg p-4 flex items-center gap-4">
          <ResultCard label="RSI" value={rsi.toFixed(2)} />
          {badge && <Badge text={badge.text} color={badge.color} />}
        </div>
      )}
      <ShareButton params={{ tool: "rsi", prices, period: String(period) }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Position Size Calculator                                           */
/* ------------------------------------------------------------------ */

function PositionTab() {
  const [balance, setBalance] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState<number | "">("");
  const [stopLoss, setStopLoss] = useState<number | "">("");

  const dollarRisk = balance * (riskPct / 100);
  const pointsAtRisk = entry !== "" && stopLoss !== "" ? Math.abs(entry - stopLoss) : 0;
  const positionSize = pointsAtRisk > 0 ? dollarRisk / pointsAtRisk : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Account Balance ($)" type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
        <InputField label="Risk %" type="number" min={0.5} max={5} step={0.5} value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value))} />
        <InputField label="Entry Price" type="number" value={entry} onChange={(e) => setEntry(e.target.value === "" ? "" : Number(e.target.value))} />
        <InputField label="Stop Loss" type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value === "" ? "" : Number(e.target.value))} />
      </div>
      {pointsAtRisk > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
          <ResultCard label="Dollar Risk" value={`$${dollarRisk.toFixed(2)}`} />
          <ResultCard label="Position Size" value={`${positionSize.toFixed(2)} units`} />
          <ResultCard label="Points at Risk" value={pointsAtRisk.toFixed(4)} />
          <ResultCard label="Risk per Unit" value={`$${pointsAtRisk.toFixed(4)}`} />
        </div>
      )}
      <ShareButton params={{ tool: "position", balance: String(balance), riskPct: String(riskPct), entry: String(entry), stopLoss: String(stopLoss) }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Risk:Reward Calculator                                             */
/* ------------------------------------------------------------------ */

function RRTab() {
  const [entry, setEntry] = useState<number | "">("");
  const [stopLoss, setStopLoss] = useState<number | "">("");
  const [takeProfit, setTakeProfit] = useState<number | "">("");

  const risk = entry !== "" && stopLoss !== "" ? Math.abs(entry - stopLoss) : 0;
  const reward = entry !== "" && takeProfit !== "" ? Math.abs(takeProfit - entry) : 0;
  const rrRatio = risk > 0 ? reward / risk : 0;
  const breakevenWinRate = rrRatio > 0 ? (1 / (1 + rrRatio)) * 100 : 0;
  const rrBadge = rrRatio >= 2 ? { text: `${rrRatio.toFixed(2)}R`, color: "emerald" as const } : rrRatio >= 1 ? { text: `${rrRatio.toFixed(2)}R`, color: "amber" as const } : rrRatio > 0 ? { text: `${rrRatio.toFixed(2)}R`, color: "red" as const } : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <InputField label="Entry Price" type="number" value={entry} onChange={(e) => setEntry(e.target.value === "" ? "" : Number(e.target.value))} />
        <InputField label="Stop Loss" type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value === "" ? "" : Number(e.target.value))} />
        <InputField label="Take Profit" type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value === "" ? "" : Number(e.target.value))} />
      </div>
      {rrRatio > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <ResultCard label="Risk" value={risk.toFixed(4)} />
            <ResultCard label="Reward" value={reward.toFixed(4)} />
            <ResultCard label="R:R Ratio" value={rrRatio.toFixed(2)} />
            <ResultCard label="Breakeven Win Rate" value={`${breakevenWinRate.toFixed(1)}%`} />
          </div>
          {rrBadge && <Badge text={rrBadge.text} color={rrBadge.color} />}
        </div>
      )}
      <ShareButton params={{ tool: "rr", entry: String(entry), stopLoss: String(stopLoss), takeProfit: String(takeProfit) }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pip Calculator                                                     */
/* ------------------------------------------------------------------ */

const PIP_VALUES: Record<string, number> = {
  EURUSD: 10,
  GBPUSD: 10,
  USDJPY: 9.3,
  XAUUSD: 100,
  BTCUSD: 10,
  ETHUSD: 10,
  XAGUSD: 50,
};

function PipTab() {
  const [pair, setPair] = useState("EURUSD");
  const [lotSize, setLotSize] = useState(1);
  const [pipCount, setPipCount] = useState(50);

  const pipValue = PIP_VALUES[pair] * lotSize;
  const total = pipValue * pipCount;

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-400">Currency Pair</span>
        <select
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
        >
          {Object.keys(PIP_VALUES).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Lot Size" type="number" min={0.01} max={100} step={0.01} value={lotSize} onChange={(e) => setLotSize(Number(e.target.value))} />
        <InputField label="Pip Count" type="number" value={pipCount} onChange={(e) => setPipCount(Number(e.target.value))} />
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-4 grid grid-cols-2 gap-4">
        <ResultCard label="Pip Value (per pip)" value={`$${pipValue.toFixed(2)}`} />
        <ResultCard label="Total P&L" value={`$${total.toFixed(2)}`} />
      </div>
      <ShareButton params={{ tool: "pip", pair, lotSize: String(lotSize), pipCount: String(pipCount) }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fibonacci Levels                                                   */
/* ------------------------------------------------------------------ */

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.618];
const GOLDEN_ZONE = new Set([0.382, 0.5, 0.618]);

function FibTab() {
  const [swingHigh, setSwingHigh] = useState<number | "">("");
  const [swingLow, setSwingLow] = useState<number | "">("");
  const [direction, setDirection] = useState<"up" | "down">("up");

  const diff = swingHigh !== "" && swingLow !== "" ? swingHigh - swingLow : 0;

  const levels = diff !== 0
    ? FIB_RATIOS.map((ratio) => {
        const level = direction === "up" ? swingHigh as number - diff * ratio : (swingLow as number) + diff * ratio;
        return { ratio, level, type: ratio > 1 ? "Extension" : "Retracement" };
      })
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField label="Swing High" type="number" value={swingHigh} onChange={(e) => setSwingHigh(e.target.value === "" ? "" : Number(e.target.value))} />
        <InputField label="Swing Low" type="number" value={swingLow} onChange={(e) => setSwingLow(e.target.value === "" ? "" : Number(e.target.value))} />
      </div>
      <div className="flex gap-4">
        {(["up", "down"] as const).map((d) => (
          <label key={d} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="fib-direction"
              checked={direction === d}
              onChange={() => setDirection(d)}
              className="accent-emerald-500"
            />
            <span className="text-sm text-zinc-300">{d === "up" ? "Up Trend" : "Down Trend"}</span>
          </label>
        ))}
      </div>
      {levels.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-400 text-xs">
                <th className="text-left px-4 py-2">Ratio</th>
                <th className="text-right px-4 py-2">Level</th>
                <th className="text-right px-4 py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(({ ratio, level, type }) => (
                <tr
                  key={ratio}
                  className={`border-b border-zinc-800 ${GOLDEN_ZONE.has(ratio) ? "bg-amber-900/30" : ""}`}
                >
                  <td className="px-4 py-2 text-zinc-300">{ratio.toFixed(3)}</td>
                  <td className="px-4 py-2 text-right text-white font-mono">{level.toFixed(4)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`text-xs ${type === "Extension" ? "text-emerald-400" : "text-zinc-400"}`}>{type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ShareButton params={{ tool: "fib", swingHigh: String(swingHigh), swingLow: String(swingLow), direction }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Client Component                                              */
/* ------------------------------------------------------------------ */

const TAB_COMPONENTS: Record<TabKey, () => React.JSX.Element> = {
  rsi: RSITab,
  position: PositionTab,
  rr: RRTab,
  pip: PipTab,
  fib: FibTab,
};

export default function ToolsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tool") as TabKey) || "rsi";
  const [activeTab, setActiveTab] = useState<TabKey>(TABS.some((t) => t.key === initialTab) ? initialTab : "rsi");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateURL = useCallback(
    (tab: TabKey) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tool", tab);
        router.replace(`/tools?${params.toString()}`, { scroll: false });
      }, 300);
    },
    [router, searchParams],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    updateURL(tab);
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="min-h-screen bg-zinc-950 pt-28 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Trading Calculators</h1>
          <p className="text-sm text-zinc-400">
            Free, open-source tools for traders. All calculations run locally in your browser.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-zinc-800 mb-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-b-2 border-emerald-500 text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <ActiveComponent />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          Built with{" "}
          <Link href="/" className="text-emerald-500 hover:underline">
            TradeClaw
          </Link>
          . View{" "}
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:underline"
          >
            source code
          </a>
          .
        </p>
      </div>
    </div>
  );
}

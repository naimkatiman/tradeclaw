'use client';

import { useState } from 'react';

interface TpSlData {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  atr: number;
  stopLoss: number;
  stopLossDistance: number;
  takeProfits: { tp1: number; tp2: number; tp3: number };
  riskRewardRatios: { tp1: number; tp2: number; tp3: number };
  positionSizing: {
    accountSize: number;
    riskPercent: number;
    riskAmount: number;
    recommendedLots: number;
    pipsAtRisk: number;
  };
}

const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];

function fmt(n: number): string {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

export function TpSlPanel() {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [data, setData] = useState<TpSlData | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tpsl?symbol=${symbol}&direction=${direction}&accountSize=${accountSize}&riskPercent=${riskPercent}`);
      const result = await res.json();
      setData(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4">
        <div className="text-xs font-semibold text-white tracking-tight">TP / SL Engine</div>
        <div className="text-[11px] text-zinc-600 mt-0.5">ATR stop loss + Fibonacci targets</div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Symbol</label>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30"
          >
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Direction</label>
          <div className="flex gap-1">
            {(['BUY', 'SELL'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  direction === d
                    ? d === 'BUY'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Account size</label>
          <input
            type="number"
            value={accountSize}
            onChange={e => setAccountSize(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30 font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Risk %</label>
          <input
            type="number"
            value={riskPercent}
            step="0.1"
            min="0.1"
            max="10"
            onChange={e => setRiskPercent(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30 font-mono"
          />
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={loading}
        className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Calculating...' : 'Calculate Levels'}
      </button>

      {data && (
        <div className="mt-4 space-y-3">
          {/* Price levels */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Entry</span>
              <span className="text-xs font-mono text-white">{fmt(data.entry)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Stop Loss</span>
              <span className="text-xs font-mono text-red-400">{fmt(data.stopLoss)}</span>
            </div>
            {(['tp1', 'tp2', 'tp3'] as const).map((key, i) => (
              <div key={key} className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                  TP{i + 1}
                  <span className="text-zinc-700">Fib {['1.618', '2.618', '4.236'][i]}</span>
                </span>
                <div className="text-right">
                  <span className="text-xs font-mono text-emerald-400">{fmt(data.takeProfits[key])}</span>
                  <span className="text-[10px] font-mono text-zinc-700 ml-2">R:{data.riskRewardRatios[key]}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Position sizing */}
          <div className="bg-white/[0.02] rounded-xl p-3 space-y-1.5">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Position sizing</div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-600">Risk amount</span>
              <span className="text-white">${data.positionSizing.riskAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-600">Pips at risk</span>
              <span className="text-white">{data.positionSizing.pipsAtRisk}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-600">ATR</span>
              <span className="text-white">{fmt(data.atr)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono border-t border-white/5 pt-1.5 mt-1.5">
              <span className="text-zinc-400">Recommended lots</span>
              <span className="text-emerald-400 font-semibold">{data.positionSizing.recommendedLots}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

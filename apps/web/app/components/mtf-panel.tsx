'use client';

import { useEffect, useState } from 'react';

interface TimeframeSignal {
  timeframe: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  rsi: number;
  macd: string;
  ema: string;
  stoch: number;
  score: number;
}

interface MTFAnalysis {
  symbol: string;
  timeframes: TimeframeSignal[];
  confluence: number;
  dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  alignedTimeframes: number;
}

const TIMEFRAMES = ['H1', 'H4', 'D1'];

function ConfluenceBar({ value, direction }: { value: number; direction: string }) {
  const color = direction === 'BUY' ? '#10B981' : direction === 'SELL' ? '#EF4444' : '#6B7280';
  return (
    <div className="relative h-1 w-full rounded-full bg-white/5">
      <div
        className="absolute h-1 rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}40` }}
      />
    </div>
  );
}

function TFCell({ signal }: { signal: TimeframeSignal }) {
  const isBuy = signal.direction === 'BUY';
  const isNeutral = signal.direction === 'NEUTRAL';
  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-300 ${
      isBuy
        ? 'bg-emerald-500/8 border-emerald-500/15'
        : isNeutral
        ? 'bg-zinc-500/8 border-zinc-500/15'
        : 'bg-red-500/8 border-red-500/15'
    }`}>
      <div className="text-[9px] text-zinc-600 font-mono uppercase">{signal.timeframe}</div>
      <div className={`text-xs font-bold tracking-wider ${
        isBuy ? 'text-emerald-400' : isNeutral ? 'text-zinc-400' : 'text-red-400'
      }`}>
        {signal.direction}
      </div>
      <div className="text-[10px] font-mono text-zinc-500">{signal.confidence}%</div>
    </div>
  );
}

export function MTFPanel({ symbol }: { symbol?: string }) {
  const [analyses, setAnalyses] = useState<MTFAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState(symbol || 'XAUUSD');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/mtf?symbol=${selectedSymbol}`);
        const data = await res.json();
        setAnalyses(data.analyses || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch_();
    const interval = setInterval(fetch_, 60000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  const analysis = analyses[0];

  const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY'];

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-white tracking-tight">Multi-Timeframe</div>
          <div className="text-[11px] text-zinc-600 mt-0.5">Confluence analysis</div>
        </div>
        <select
          value={selectedSymbol}
          onChange={e => { setSelectedSymbol(e.target.value); setLoading(true); }}
          className="bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-xs text-zinc-400 outline-none focus:border-emerald-500/30"
        >
          {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {TIMEFRAMES.map(tf => (
              <div key={tf} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-1 bg-white/5 rounded animate-pulse" />
        </div>
      ) : analysis ? (
        <div className="space-y-4">
          {/* TF grid */}
          <div className="grid grid-cols-3 gap-2">
            {analysis.timeframes.map(tf => (
              <TFCell key={tf.timeframe} signal={tf} />
            ))}
          </div>

          {/* Confluence bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Confluence</span>
              <span className={`text-xs font-bold font-mono ${
                analysis.dominantDirection === 'BUY' ? 'text-emerald-400'
                : analysis.dominantDirection === 'SELL' ? 'text-red-400'
                : 'text-zinc-400'
              }`}>
                {analysis.dominantDirection} · {analysis.confluence}%
              </span>
            </div>
            <ConfluenceBar value={analysis.confluence} direction={analysis.dominantDirection} />
          </div>

          {/* Alignment stat */}
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-700">Aligned TFs</span>
            <span className="text-zinc-400">{analysis.alignedTimeframes} / {analysis.timeframes.length}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-zinc-700">No MTF data</div>
      )}
    </div>
  );
}

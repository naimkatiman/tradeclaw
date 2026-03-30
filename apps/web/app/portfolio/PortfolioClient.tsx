'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const PAIRS = [
  'BTCUSD',
  'ETHUSD',
  'XAUUSD',
  'XAGUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'GBPJPY',
  'AUDUSD',
  'USDCAD',
];

const PAIR_LABELS: Record<string, string> = {
  BTCUSD: 'BTC/USD',
  ETHUSD: 'ETH/USD',
  XAUUSD: 'XAU/USD (Gold)',
  XAGUSD: 'XAG/USD (Silver)',
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  GBPJPY: 'GBP/JPY',
  AUDUSD: 'AUD/USD',
  USDCAD: 'USD/CAD',
};

interface Holding {
  id: string;
  pair: string;
  qty: number;
}

interface SignalData {
  pair: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entry: number;
  tp: number;
  sl: number;
  timeframe: string;
  rsi?: number;
}

interface ApiSignal {
  pair?: string;
  symbol?: string;
  direction: string;
  confidence: number;
  entry?: number;
  entryPrice?: number;
  tp?: number;
  takeProfit?: number;
  sl?: number;
  stopLoss?: number;
  timeframe?: string;
  indicators?: { rsi?: number };
}

function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' | 'HOLD' }) {
  if (direction === 'BUY') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <TrendingUp className="w-3 h-3" />
        BUY
      </span>
    );
  }
  if (direction === 'SELL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
        <TrendingDown className="w-3 h-3" />
        SELL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
      <Minus className="w-3 h-3" />
      HOLD
    </span>
  );
}

function AlignmentIcon({ direction }: { direction: 'BUY' | 'SELL' | 'HOLD' }) {
  if (direction === 'BUY') {
    return <CheckCircle className="w-5 h-5 text-emerald-400" title="Signal: BUY — good for longs" />;
  }
  if (direction === 'SELL') {
    return <AlertCircle className="w-5 h-5 text-rose-400" title="Signal: SELL — caution" />;
  }
  return <Minus className="w-5 h-5 text-zinc-500" title="No strong signal" />;
}

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? 'bg-emerald-500'
      : value >= 65
        ? 'bg-yellow-500'
        : 'bg-rose-500';
  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function PortfolioClient() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [signals, setSignals] = useState<Record<string, SignalData>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newPair, setNewPair] = useState(PAIRS[0]);
  const [newQty, setNewQty] = useState('1');
  const [addError, setAddError] = useState('');

  // Load holdings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tc-portfolio-holdings');
      if (saved) {
        setHoldings(JSON.parse(saved) as Holding[]);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveHoldings = useCallback((h: Holding[]) => {
    setHoldings(h);
    try {
      localStorage.setItem('tc-portfolio-holdings', JSON.stringify(h));
    } catch {
      // ignore
    }
  }, []);

  const fetchSignals = useCallback(async (pairsToFetch: string[]) => {
    if (pairsToFetch.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/signals?timeframe=H1&limit=50`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('API error');
      const data = (await res.json()) as ApiSignal[];
      const map: Record<string, SignalData> = {};
      for (const pair of pairsToFetch) {
        const match = data.find(
          (s) =>
            (s.pair || s.symbol || '')
              .toUpperCase()
              .replace('/', '')
              .replace('-', '') ===
            pair.toUpperCase().replace('/', '').replace('-', '')
        );
        if (match) {
          const dir = match.direction.toUpperCase() as 'BUY' | 'SELL' | 'HOLD';
          map[pair] = {
            pair,
            direction: ['BUY', 'SELL', 'HOLD'].includes(dir) ? dir : 'HOLD',
            confidence: match.confidence ?? 50,
            entry: match.entry ?? match.entryPrice ?? 0,
            tp: match.tp ?? match.takeProfit ?? 0,
            sl: match.sl ?? match.stopLoss ?? 0,
            timeframe: match.timeframe ?? 'H1',
            rsi: match.indicators?.rsi,
          };
        } else {
          map[pair] = {
            pair,
            direction: 'HOLD',
            confidence: 50,
            entry: 0,
            tp: 0,
            sl: 0,
            timeframe: 'H1',
          };
        }
      }
      setSignals((prev) => ({ ...prev, ...map }));
      setLastUpdated(new Date());
    } catch {
      // silent fail — keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when holdings change
  useEffect(() => {
    const pairs = [...new Set(holdings.map((h) => h.pair))];
    if (pairs.length > 0) {
      void fetchSignals(pairs);
    }
  }, [holdings, fetchSignals]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const pairs = [...new Set(holdings.map((h) => h.pair))];
      if (pairs.length > 0) void fetchSignals(pairs);
    }, 60000);
    return () => clearInterval(interval);
  }, [holdings, fetchSignals]);

  const addHolding = () => {
    const qty = parseFloat(newQty);
    if (!qty || qty <= 0) {
      setAddError('Enter a valid quantity > 0');
      return;
    }
    setAddError('');
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const updated = [...holdings, { id, pair: newPair, qty }];
    saveHoldings(updated);
    setNewQty('1');
  };

  const removeHolding = (id: string) => {
    saveHoldings(holdings.filter((h) => h.id !== id));
  };

  const exportJSON = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      holdings: holdings.map((h) => ({
        ...h,
        signal: signals[h.pair] ?? null,
      })),
      consensus: getConsensus(),
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeclaw-portfolio-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getConsensus = () => {
    if (holdings.length === 0) return { buyCount: 0, sellCount: 0, holdCount: 0, bullishPct: 50 };
    const pairs = [...new Set(holdings.map((h) => h.pair))];
    let buy = 0, sell = 0, hold = 0;
    for (const p of pairs) {
      const d = signals[p]?.direction ?? 'HOLD';
      if (d === 'BUY') buy++;
      else if (d === 'SELL') sell++;
      else hold++;
    }
    const total = pairs.length;
    return {
      buyCount: buy,
      sellCount: sell,
      holdCount: hold,
      bullishPct: total > 0 ? Math.round((buy / total) * 100) : 50,
    };
  };

  const consensus = getConsensus();
  const uniquePairs = [...new Set(holdings.map((h) => h.pair))];
  const bearishPct = 100 - consensus.bullishPct;
  const isBull = consensus.bullishPct >= 55;
  const isBear = consensus.bullishPct <= 45;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-zinc-900/50 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <Briefcase className="w-6 h-6 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold">Portfolio Signal Scanner</h1>
              </div>
              <p className="text-zinc-400 text-sm max-w-xl">
                Add your holdings to see real-time TradeClaw signal alignment — BUY (bullish), SELL (caution), or HOLD (neutral) — for each asset.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  const pairs = uniquePairs;
                  if (pairs.length > 0) void fetchSignals(pairs);
                }}
                disabled={loading || holdings.length === 0}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors border border-zinc-700"
                title="Refresh signals"
              >
                <RefreshCw className={`w-4 h-4 text-zinc-300 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {holdings.length > 0 && (
                <button
                  onClick={exportJSON}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700 text-sm text-zinc-300"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              )}
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-zinc-600 mt-3">
              Last updated: {lastUpdated.toLocaleTimeString()} · auto-refreshes every 60s
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Add Holding */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
            Add Holding
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={newPair}
              onChange={(e) => setNewPair(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 sm:w-52"
            >
              {PAIRS.map((p) => (
                <option key={p} value={p}>
                  {PAIR_LABELS[p] ?? p}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="Quantity"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 sm:w-36"
            />
            <button
              onClick={addHolding}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {addError && <p className="mt-2 text-xs text-rose-400">{addError}</p>}
        </div>

        {/* Portfolio Consensus Gauge */}
        {holdings.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
              Portfolio Consensus
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{consensus.buyCount}</div>
                <div className="text-xs text-zinc-500 mt-1">BUY signals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-400">{consensus.sellCount}</div>
                <div className="text-xs text-zinc-500 mt-1">SELL signals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-400">{consensus.holdCount}</div>
                <div className="text-xs text-zinc-500 mt-1">HOLD / neutral</div>
              </div>
            </div>

            {/* Split bar */}
            <div className="flex items-center justify-between mb-2 text-sm font-medium">
              <span className="text-emerald-400">{consensus.bullishPct}% BULLISH</span>
              <span className="text-rose-400">{bearishPct}% BEARISH</span>
            </div>
            <div className="h-5 rounded-full overflow-hidden flex bg-zinc-800 border border-zinc-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                style={{ width: `${consensus.bullishPct}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-700"
                style={{ width: `${bearishPct}%` }}
              />
            </div>
            <div className="mt-3 text-center">
              <span
                className={`text-sm font-semibold ${isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-zinc-400'}`}
              >
                {isBull
                  ? `🐂 Risk-On — ${consensus.buyCount} of ${uniquePairs.length} assets bullish`
                  : isBear
                    ? `🐻 Risk-Off — ${consensus.sellCount} of ${uniquePairs.length} assets bearish`
                    : `⚖️ Mixed — signals split across your portfolio`}
              </span>
            </div>
          </div>
        )}

        {/* Holdings Table */}
        {holdings.length > 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Holdings &amp; Signal Alignment
              </h2>
              <span className="text-xs text-zinc-500">{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {holdings.map((holding) => {
                const sig = signals[holding.pair];
                const dir = sig?.direction ?? 'HOLD';
                return (
                  <div
                    key={holding.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Alignment icon */}
                    <div className="shrink-0">
                      <AlignmentIcon direction={dir} />
                    </div>

                    {/* Pair + qty */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-white">
                          {PAIR_LABELS[holding.pair] ?? holding.pair}
                        </span>
                        <DirectionBadge direction={dir} />
                      </div>
                      <p className="text-xs text-zinc-500">
                        Qty: <span className="text-zinc-300">{holding.qty}</span>
                        {sig && sig.timeframe && (
                          <>
                            {' '}· TF: <span className="text-zinc-300">{sig.timeframe}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Confidence */}
                    {sig && (
                      <div className="sm:w-40 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-500">Confidence</span>
                          <span className="text-xs font-bold text-zinc-300">{sig.confidence}%</span>
                        </div>
                        <ConfidenceBar value={sig.confidence} />
                      </div>
                    )}

                    {/* Entry / TP / SL */}
                    {sig && sig.entry > 0 && (
                      <div className="sm:w-52 shrink-0 text-xs text-zinc-500 space-y-0.5">
                        <div>
                          Entry: <span className="text-zinc-300">{sig.entry.toFixed(2)}</span>
                        </div>
                        <div>
                          TP: <span className="text-emerald-400">{sig.tp.toFixed(2)}</span>
                          {' '}· SL: <span className="text-rose-400">{sig.sl.toFixed(2)}</span>
                        </div>
                        {sig.rsi !== undefined && (
                          <div>
                            RSI: <span className="text-zinc-300">{sig.rsi.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeHolding(holding.id)}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Remove holding"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 border-dashed rounded-xl p-12 text-center">
            <Briefcase className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-1">No holdings yet</p>
            <p className="text-zinc-600 text-xs">Add an asset above to see its TradeClaw signal alignment.</p>
          </div>
        )}

        {/* GitHub Star CTA */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-900/60 border border-emerald-500/20 rounded-xl p-6 text-center">
          <Star className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">Find TradeClaw useful?</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Star the repo to help other traders discover it — and unlock milestone features at 100 / 500 / 1000 ⭐
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium text-sm transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
          <p className="mt-3 text-xs text-zinc-600">
            Also try:{' '}
            <Link href="/screener" className="text-emerald-500 hover:text-emerald-400">
              Screener
            </Link>
            {' '}·{' '}
            <Link href="/paper-trading" className="text-emerald-500 hover:text-emerald-400">
              Paper Trading
            </Link>
            {' '}·{' '}
            <Link href="/alerts" className="text-emerald-500 hover:text-emerald-400">
              Price Alerts
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

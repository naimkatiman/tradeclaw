'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Trade {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  lotSize: number;
  entry: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlPct: number;
  openedAt: string;
  status: 'open' | 'closed';
  closedAt?: string;
  closePrice?: number;
}

interface AccountState {
  balance: number;
  equity: number;
  trades: Trade[];
  closedTrades: Trade[];
}

const INITIAL_BALANCE = 10000;
const SYMBOLS = ['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAGUSD', 'AUDUSD'];
const LOT_SIZES = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0];

const BASE_PRICES: Record<string, number> = {
  XAUUSD: 2180, BTCUSD: 87500, ETHUSD: 3400, EURUSD: 1.083,
  GBPUSD: 1.264, USDJPY: 151.2, XAGUSD: 24.8, AUDUSD: 0.654,
};

function noisyPrice(base: number): number {
  return +(base * (1 + (Math.random() - 0.5) * 0.004)).toFixed(base > 100 ? 2 : 5);
}

function fmtPrice(n: number) {
  return n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(5);
}

function fmtPnl(n: number) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${n.toFixed(2)}`;
}

const NAV_PAGES = [
  { href: '/dashboard', label: 'Signals' },
  { href: '/paper-trading', label: 'Paper Trade' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/strategy-builder', label: 'Strategy' },
];

export default function PaperTradingPage() {
  const [account, setAccount] = useState<AccountState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tc-paper-account');
      if (saved) return JSON.parse(saved);
    }
    return { balance: INITIAL_BALANCE, equity: INITIAL_BALANCE, trades: [], closedTrades: [] };
  });

  const [symbol, setSymbol] = useState('XAUUSD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [lotSize, setLotSize] = useState(0.1);
  const [prices, setPrices] = useState<Record<string, number>>(BASE_PRICES);

  const saveAccount = useCallback((acc: AccountState) => {
    localStorage.setItem('tc-paper-account', JSON.stringify(acc));
    setAccount(acc);
  }, []);

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        for (const sym of SYMBOLS) {
          next[sym] = noisyPrice(prev[sym]);
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update open trade P&L
  useEffect(() => {
    setAccount(prev => {
      const updatedTrades = prev.trades.map(t => {
        const cp = prices[t.symbol] || t.entry;
        const pnl = t.direction === 'BUY'
          ? (cp - t.entry) * t.lotSize * 100
          : (t.entry - cp) * t.lotSize * 100;
        return { ...t, currentPrice: cp, pnl: +pnl.toFixed(2), pnlPct: +(pnl / INITIAL_BALANCE * 100).toFixed(2) };
      });
      const equity = prev.balance + updatedTrades.reduce((s, t) => s + t.pnl, 0);
      return { ...prev, trades: updatedTrades, equity: +equity.toFixed(2) };
    });
  }, [prices]);

  const openTrade = () => {
    const entry = prices[symbol] || BASE_PRICES[symbol];
    const atr = entry * 0.006;
    const sl = direction === 'BUY' ? +(entry - atr * 1.5).toFixed(5) : +(entry + atr * 1.5).toFixed(5);
    const tp = direction === 'BUY' ? +(entry + atr * 2.5).toFixed(5) : +(entry - atr * 2.5).toFixed(5);

    const trade: Trade = {
      id: `PT-${Date.now().toString(36).toUpperCase()}`,
      symbol,
      direction,
      lotSize,
      entry,
      currentPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      pnl: 0,
      pnlPct: 0,
      openedAt: new Date().toISOString(),
      status: 'open',
    };

    const updated = { ...account, trades: [...account.trades, trade] };
    saveAccount(updated);
  };

  const closeTrade = (id: string) => {
    setAccount(prev => {
      const trade = prev.trades.find(t => t.id === id);
      if (!trade) return prev;
      const closed: Trade = {
        ...trade,
        status: 'closed',
        closedAt: new Date().toISOString(),
        closePrice: trade.currentPrice,
      };
      const newBalance = +(prev.balance + trade.pnl).toFixed(2);
      const updated = {
        ...prev,
        balance: newBalance,
        equity: newBalance,
        trades: prev.trades.filter(t => t.id !== id),
        closedTrades: [closed, ...prev.closedTrades],
      };
      saveAccount(updated);
      return updated;
    });
  };

  const resetAccount = () => {
    const fresh = { balance: INITIAL_BALANCE, equity: INITIAL_BALANCE, trades: [], closedTrades: [] };
    saveAccount(fresh);
  };

  const wins = account.closedTrades.filter(t => t.pnl > 0).length;
  const totalClosed = account.closedTrades.length;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : 0;
  const totalPnl = account.closedTrades.reduce((s, t) => s + t.pnl, 0);
  const openPnl = account.trades.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
              <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {NAV_PAGES.map(page => (
              <Link key={page.href} href={page.href} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                page.href === '/paper-trading'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}>{page.label}</Link>
            ))}
          </div>
          <button onClick={resetAccount} className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">Reset account</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Account summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Balance', value: `$${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'text-white' },
            { label: 'Equity', value: `$${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: account.equity >= INITIAL_BALANCE ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Open P&L', value: fmtPnl(openPnl), color: openPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: `Win rate (${totalClosed})`, value: `${winRate}%`, color: winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card rounded-2xl p-4 text-center">
              <div className={`text-xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order form */}
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs font-semibold text-white mb-4">Place order</div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Symbol</label>
                <select
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none focus:border-emerald-500/30"
                >
                  {SYMBOLS.map(s => (
                    <option key={s} value={s}>{s} — {fmtPrice(prices[s] || BASE_PRICES[s])}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['BUY', 'SELL'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        direction === d
                          ? d === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border border-red-500/25'
                          : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Lot size</label>
                <div className="flex flex-wrap gap-1.5">
                  {LOT_SIZES.map(ls => (
                    <button
                      key={ls}
                      onClick={() => setLotSize(ls)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                        lotSize === ls
                          ? 'bg-white/10 text-white border border-white/15'
                          : 'bg-white/5 text-zinc-600 border border-white/5 hover:text-zinc-400'
                      }`}
                    >
                      {ls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <div className="text-[10px] text-zinc-700 font-mono mb-2">
                  Current: {fmtPrice(prices[symbol] || BASE_PRICES[symbol])}
                </div>
                <button
                  onClick={openTrade}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
                    direction === 'BUY'
                      ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {direction} {lotSize} lots
                </button>
              </div>
            </div>
          </div>

          {/* Open positions */}
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs font-semibold text-white mb-4">
              Open positions <span className="text-zinc-700 ml-1">({account.trades.length})</span>
            </div>

            {account.trades.length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-700">No open positions</div>
            ) : (
              <div className="space-y-2">
                {account.trades.map(trade => (
                  <div key={trade.id} className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-white">{trade.symbol}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          trade.direction === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>{trade.direction}</span>
                        <span className="text-[10px] text-zinc-700 font-mono">{trade.lotSize}L</span>
                      </div>
                      <button
                        onClick={() => closeTrade(trade.id)}
                        className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/20 px-2 py-1 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-700">Entry {fmtPrice(trade.entry)} → {fmtPrice(trade.currentPrice)}</span>
                      <span className={trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {fmtPnl(trade.pnl)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trade history */}
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs font-semibold text-white mb-4">
              Trade history <span className="text-zinc-700 ml-1">({account.closedTrades.length})</span>
            </div>

            {account.closedTrades.length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-700">No closed trades yet</div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/[0.02] rounded-xl p-2.5 text-center">
                    <div className={`text-sm font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtPnl(totalPnl)}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">Total P&L</div>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl p-2.5 text-center">
                    <div className="text-sm font-mono font-bold text-white">{winRate}%</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">Win rate</div>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {account.closedTrades.map(trade => (
                    <div key={trade.id} className="flex items-center justify-between text-[10px] font-mono py-1.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">{trade.symbol}</span>
                        <span className={trade.direction === 'BUY' ? 'text-emerald-600' : 'text-red-600'}>{trade.direction}</span>
                      </div>
                      <span className={trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtPnl(trade.pnl)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface BrokerConfig {
  id: string;
  label: string;
  token: string;
  accountId: string;
  server: string;
  platform: 'mt4' | 'mt5';
  connected: boolean;
  addedAt: number;
}

interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  profit: number;
  currency: string;
  leverage: number;
  name: string;
}

interface Position {
  id: string;
  symbol: string;
  type: 'POSITION_TYPE_BUY' | 'POSITION_TYPE_SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  openTime: string;
}

const STORAGE_KEY = 'tc-brokers';

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function mockAccountInfo(seed: number): AccountInfo {
  const balance = 10000 + seededRandom(seed) * 40000;
  const profit = (seededRandom(seed + 1) - 0.4) * balance * 0.15;
  const equity = balance + profit;
  const margin = equity * (0.05 + seededRandom(seed + 2) * 0.15);
  const freeMargin = equity - margin;
  return {
    balance: Math.round(balance * 100) / 100,
    equity: Math.round(equity * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    freeMargin: Math.round(freeMargin * 100) / 100,
    marginLevel: Math.round((equity / margin) * 100 * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    currency: 'USD',
    leverage: [50, 100, 200, 500][Math.floor(seededRandom(seed + 3) * 4)],
    name: `Account ${Math.floor(seededRandom(seed + 4) * 900000 + 100000)}`,
  };
}

function mockPositions(seed: number): Position[] {
  const symbols = ['XAUUSD', 'EURUSD', 'BTCUSD', 'GBPUSD', 'USDJPY'];
  const count = Math.floor(seededRandom(seed) * 5) + 1;
  return Array.from({ length: count }, (_, i) => {
    const r = seededRandom(seed + i * 13);
    const r2 = seededRandom(seed + i * 13 + 1);
    const r3 = seededRandom(seed + i * 13 + 2);
    const symbol = symbols[Math.floor(r * symbols.length)];
    const isBuy = r2 > 0.5;
    const basePrices: Record<string, number> = {
      XAUUSD: 2180, EURUSD: 1.083, BTCUSD: 87500, GBPUSD: 1.264, USDJPY: 151.2,
    };
    const openPrice = basePrices[symbol] * (0.998 + r3 * 0.004);
    const currentPrice = openPrice * (0.997 + seededRandom(seed + i * 13 + 3) * 0.006);
    const volume = [0.01, 0.05, 0.1, 0.5, 1.0][Math.floor(r * 5)];
    const profit = (currentPrice - openPrice) * (isBuy ? 1 : -1) * volume * 1000;
    return {
      id: `pos-${seed}-${i}`,
      symbol,
      type: isBuy ? 'POSITION_TYPE_BUY' : 'POSITION_TYPE_SELL',
      volume,
      openPrice: Math.round(openPrice * 100000) / 100000,
      currentPrice: Math.round(currentPrice * 100000) / 100000,
      profit: Math.round(profit * 100) / 100,
      openTime: new Date(Date.now() - Math.floor(r3 * 86400000 * 7)).toISOString(),
    };
  });
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function MetricBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">{label}</span>
      <span className={`text-xl font-mono font-bold tabular-nums ${color || 'text-[var(--foreground)]'}`}>{value}</span>
      {sub && <span className="text-[10px] text-[var(--text-secondary)]">{sub}</span>}
    </div>
  );
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-[var(--text-secondary)]'}`} />
  );
}

export default function BrokerPage() {
  const [brokers, setBrokers] = useState<BrokerConfig[]>([]);
  const [activeBrokerId, setActiveBrokerId] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    label: '',
    token: '',
    accountId: '',
    server: '',
    platform: 'mt5' as 'mt4' | 'mt5',
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: BrokerConfig[] = JSON.parse(raw);
        setBrokers(parsed);
        const active = parsed.find(b => b.connected);
        if (active) setActiveBrokerId(active.id);
      }
    } catch { /* ignore */ }
  }, []);

  const save = (updated: BrokerConfig[]) => {
    setBrokers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const loadAccountData = useCallback((broker: BrokerConfig) => {
    setLoadingAccount(true);
    setError('');
    // Simulate MetaApi call with seeded mock data
    setTimeout(() => {
      const seed = broker.accountId.charCodeAt(0) * 31 + broker.token.length * 7;
      setAccountInfo(mockAccountInfo(seed));
      setPositions(mockPositions(seed));
      setLoadingAccount(false);
    }, 800);
  }, []);

  useEffect(() => {
    if (!activeBrokerId) return;
    const broker = brokers.find(b => b.id === activeBrokerId);
    if (broker?.connected) loadAccountData(broker);
  }, [activeBrokerId, brokers, loadAccountData]);

  const handleConnect = () => {
    if (!form.token.trim() || !form.accountId.trim()) {
      setError('MetaApi token and account ID are required.');
      return;
    }
    setConnecting(true);
    setError('');
    setTimeout(() => {
      const newBroker: BrokerConfig = {
        id: `broker-${Date.now()}`,
        label: form.label || `${form.platform.toUpperCase()} Account`,
        token: form.token,
        accountId: form.accountId,
        server: form.server,
        platform: form.platform,
        connected: true,
        addedAt: Date.now(),
      };
      const updated = [...brokers, newBroker];
      save(updated);
      setActiveBrokerId(newBroker.id);
      setConnecting(false);
      setShowAddForm(false);
      setForm({ label: '', token: '', accountId: '', server: '', platform: 'mt5' });
    }, 1200);
  };

  const handleDisconnect = (id: string) => {
    const updated = brokers.map(b => b.id === id ? { ...b, connected: false } : b);
    save(updated);
    if (activeBrokerId === id) {
      setActiveBrokerId(null);
      setAccountInfo(null);
      setPositions([]);
    }
  };

  const handleRemove = (id: string) => {
    const updated = brokers.filter(b => b.id !== id);
    save(updated);
    if (activeBrokerId === id) {
      setActiveBrokerId(null);
      setAccountInfo(null);
      setPositions([]);
    }
  };

  const activeBroker = brokers.find(b => b.id === activeBrokerId);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Broker Connections</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Connect MT4/MT5 accounts via MetaApi</p>
          </div>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Broker'}
          </button>
        </div>

        {/* Add Broker Form */}
        {showAddForm && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)]/80 mb-4 uppercase tracking-wider">New Connection</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Label</label>
                <input
                  className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40"
                  placeholder="My MT5 Account"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Platform</label>
                <div className="flex gap-2">
                  {(['mt4', 'mt5'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        form.platform === p
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-[var(--text-secondary)] hover:border-zinc-300 dark:hover:border-white/20'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">MetaApi Token</label>
                <input
                  className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 font-mono"
                  placeholder="eyJhbGciOiJSUzI1NiIs..."
                  type="password"
                  value={form.token}
                  onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Account ID</label>
                <input
                  className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 font-mono"
                  placeholder="account-id-from-metaapi"
                  value={form.accountId}
                  onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Broker Server (optional)</label>
                <input
                  className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 font-mono"
                  placeholder="e.g. ICMarkets-Demo"
                  value={form.server}
                  onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
              <span className="text-[10px] text-[var(--text-secondary)]">
                Uses MetaApi cloud — get your token at metaapi.cloud
              </span>
            </div>
          </div>
        )}

        {/* Broker List */}
        {brokers.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            {brokers.map(broker => (
              <div
                key={broker.id}
                onClick={() => broker.connected && setActiveBrokerId(broker.id)}
                className={`glass-card p-4 flex items-center justify-between cursor-pointer transition-all ${
                  activeBrokerId === broker.id ? 'border-emerald-500/25' : 'hover:border-[var(--foreground)]/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <StatusDot connected={broker.connected} />
                  <div>
                    <span className="text-sm font-semibold text-[var(--foreground)]">{broker.label}</span>
                    <span className="ml-2 text-[10px] text-[var(--text-secondary)] font-mono uppercase">{broker.platform}</span>
                    {broker.server && (
                      <span className="ml-2 text-[10px] text-[var(--text-secondary)]">{broker.server}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${broker.connected ? 'text-emerald-500' : 'text-zinc-600'}`}>
                    {broker.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  {broker.connected ? (
                    <button
                      onClick={e => { e.stopPropagation(); handleDisconnect(broker.id); }}
                      className="text-[10px] text-[var(--text-secondary)] hover:text-red-500 px-2 py-1 rounded border border-transparent hover:border-red-500/20 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(broker.id); }}
                      className="text-[10px] text-[var(--text-secondary)] hover:text-red-500 px-2 py-1 rounded border border-transparent hover:border-red-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Account Dashboard */}
        {activeBroker && activeBroker.connected && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <StatusDot connected />
              <span className="text-xs text-[var(--text-secondary)] font-semibold">{activeBroker.label}</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono uppercase">{activeBroker.platform}</span>
            </div>

            {loadingAccount ? (
              <div className="glass-card p-8 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : accountInfo && (
              <>
                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <MetricBox label="Balance" value={`$${fmt(accountInfo.balance)}`} sub={accountInfo.currency} />
                  <MetricBox
                    label="Equity"
                    value={`$${fmt(accountInfo.equity)}`}
                    color={accountInfo.equity >= accountInfo.balance ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricBox
                    label="P&L"
                    value={`${accountInfo.profit >= 0 ? '+' : ''}$${fmt(accountInfo.profit)}`}
                    color={accountInfo.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricBox label="Margin" value={`$${fmt(accountInfo.margin)}`} />
                  <MetricBox label="Free Margin" value={`$${fmt(accountInfo.freeMargin)}`} />
                  <MetricBox label="Margin Level" value={`${fmt(accountInfo.marginLevel)}%`} sub={`1:${accountInfo.leverage}`} color="text-[var(--foreground)]/80" />
                </div>

                {/* Open Positions */}
                <div className="glass-card p-4">
                  <h2 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-4">
                    Open Positions ({positions.length})
                  </h2>
                  {positions.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] text-center py-4">No open positions</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                            <th className="text-left pb-2 font-normal">Symbol</th>
                            <th className="text-left pb-2 font-normal">Direction</th>
                            <th className="text-right pb-2 font-normal">Volume</th>
                            <th className="text-right pb-2 font-normal">Open</th>
                            <th className="text-right pb-2 font-normal">Current</th>
                            <th className="text-right pb-2 font-normal">P&L</th>
                            <th className="text-right pb-2 font-normal">Opened</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map(pos => {
                            const isBuy = pos.type === 'POSITION_TYPE_BUY';
                            const posProfit = pos.profit;
                            const fmtPrice = (n: number) => n >= 1000 ? n.toFixed(2) : n.toFixed(5);
                            return (
                              <tr key={pos.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--foreground)]/[0.02]">
                                <td className="py-2 font-mono font-semibold text-[var(--foreground)]">{pos.symbol}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isBuy
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                  }`}>
                                    {isBuy ? 'BUY' : 'SELL'}
                                  </span>
                                </td>
                                <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{pos.volume}</td>
                                <td className="py-2 text-right font-mono text-[var(--text-secondary)]/80">{fmtPrice(pos.openPrice)}</td>
                                <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{fmtPrice(pos.currentPrice)}</td>
                                <td className={`py-2 text-right font-mono font-semibold ${posProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {posProfit >= 0 ? '+' : ''}{fmt(posProfit)}
                                </td>
                                <td className="py-2 text-right text-[var(--text-secondary)]">
                                  {new Date(pos.openTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Empty state */}
        {brokers.length === 0 && !showAddForm && (
          <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--foreground)]/[0.03] flex items-center justify-center text-2xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-secondary)]">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]/80">No brokers connected</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Add an MT4 or MT5 account via MetaApi to see live data</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Connect Broker
            </button>
          </div>
        )}

        {/* MetaApi setup guide */}
        <div className="mt-8 glass-card p-5">
          <h2 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-3">MetaApi Setup</h2>
          <ol className="flex flex-col gap-2 text-xs text-[var(--text-secondary)]">
            <li><span className="text-[var(--foreground)]/80 font-semibold">1.</span> Create a free account at <span className="text-[var(--foreground)]/80 font-mono">metaapi.cloud</span></li>
            <li><span className="text-[var(--foreground)]/80 font-semibold">2.</span> Add your MT4/MT5 broker credentials in the MetaApi dashboard</li>
            <li><span className="text-[var(--foreground)]/80 font-semibold">3.</span> Copy your API token and deployed account ID</li>
            <li><span className="text-[var(--foreground)]/80 font-semibold">4.</span> Paste both above — TradeClaw connects via the MetaApi cloud bridge</li>
            <li><span className="text-[var(--foreground)]/80 font-semibold">5.</span> For production use, set <span className="text-[var(--foreground)]/80 font-mono">METAAPI_TOKEN</span> in server env and proxy via <span className="text-[var(--foreground)]/80 font-mono">/api/broker</span></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

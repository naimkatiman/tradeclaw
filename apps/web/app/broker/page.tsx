'use client';

import { useState, useEffect, useCallback } from 'react';

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

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const STORAGE_KEY = 'tc-brokers';

function mapAccountInfo(raw: Record<string, unknown>): AccountInfo {
  return {
    balance: Number(raw.balance) || 0,
    equity: Number(raw.equity) || 0,
    margin: Number(raw.margin) || 0,
    freeMargin: Number(raw.freeMargin) || 0,
    marginLevel: Number(raw.marginLevel) || 0,
    profit: Number(raw.profit) || 0,
    currency: String(raw.currency || 'USD'),
    leverage: Number(raw.leverage) || 0,
    name: String(raw.name || raw.login || 'Account'),
  };
}

function mapPosition(raw: Record<string, unknown>): Position {
  return {
    id: String(raw.id || raw.positionId || ''),
    symbol: String(raw.symbol || ''),
    type: raw.type === 'POSITION_TYPE_SELL' ? 'POSITION_TYPE_SELL' : 'POSITION_TYPE_BUY',
    volume: Number(raw.volume) || 0,
    openPrice: Number(raw.openPrice) || 0,
    currentPrice: Number(raw.currentPrice) || 0,
    profit: Number(raw.profit) || 0,
    openTime: String(raw.openTime || raw.time || new Date().toISOString()),
  };
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

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colorMap: Record<ConnectionStatus, string> = {
    connected: 'bg-emerald-400',
    connecting: 'bg-amber-400 animate-pulse',
    error: 'bg-red-400',
    disconnected: 'bg-zinc-600',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colorMap[status]}`} />;
}

function ConnectionBadge({ status, error }: { status: ConnectionStatus; error?: string }) {
  const config: Record<ConnectionStatus, { bg: string; border: string; text: string; label: string }> = {
    connected: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', label: 'Live Connection' },
    connecting: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400', label: 'Connecting...' },
    error: { bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400', label: error || 'Connection Error' },
    disconnected: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', text: 'text-[var(--text-secondary)]', label: 'Disconnected' },
  };
  const c = config[status];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-4 py-2.5 text-sm ${c.text} flex items-center gap-2`}>
      <StatusDot status={status} />
      <span className="font-medium">{c.label}</span>
    </div>
  );
}

async function fetchBrokerData(token: string, accountId: string): Promise<{
  accountInfo: AccountInfo;
  positions: Position[];
}> {
  const res = await fetch('/api/broker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, accountId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return {
    accountInfo: mapAccountInfo(data.accountInfo),
    positions: Array.isArray(data.positions) ? data.positions.map((p: Record<string, unknown>) => mapPosition(p)) : [],
  };
}

export default function BrokerPage() {
  const [brokers, setBrokers] = useState<BrokerConfig[]>([]);
  const [activeBrokerId, setActiveBrokerId] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [error, setError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [form, setForm] = useState({
    label: '',
    token: '',
    accountId: '',
    server: '',
    platform: 'mt5' as 'mt4' | 'mt5',
  });

  useEffect(() => {
    setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: BrokerConfig[] = JSON.parse(raw);
          setBrokers(parsed);
          const active = parsed.find(b => b.connected);
          if (active) setActiveBrokerId(active.id);
        }
      } catch { /* ignore */ }
    }, 0);
  }, []);

  const save = (updated: BrokerConfig[]) => {
    setBrokers(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const loadAccountData = useCallback(async (broker: BrokerConfig) => {
    setLoadingAccount(true);
    setError('');
    setConnectionStatus('connecting');

    try {
      const { accountInfo: info, positions: pos } = await fetchBrokerData(broker.token, broker.accountId);
      setAccountInfo(info);
      setPositions(pos);
      setConnectionStatus('connected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load account data';
      setError(message);
      setConnectionStatus('error');
      setAccountInfo(null);
      setPositions([]);
    } finally {
      setLoadingAccount(false);
    }
  }, []);

  useEffect(() => {
    if (!activeBrokerId) return;
    const broker = brokers.find(b => b.id === activeBrokerId);
    if (broker?.connected) {
      loadAccountData(broker);
    }
  }, [activeBrokerId, brokers, loadAccountData]);

  const handleTestConnection = async () => {
    if (!form.token.trim() || !form.accountId.trim()) {
      setTestResult({ ok: false, message: 'Token and Account ID are required' });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);

    try {
      await fetchBrokerData(form.token, form.accountId);
      setTestResult({ ok: true, message: 'Connection successful — credentials verified' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setTestResult({ ok: false, message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleConnect = async () => {
    if (!form.token.trim() || !form.accountId.trim()) {
      setError('MetaApi token and account ID are required.');
      return;
    }
    setConnectionStatus('connecting');
    setError('');

    try {
      // Verify connection before saving
      await fetchBrokerData(form.token, form.accountId);

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
      setShowAddForm(false);
      setForm({ label: '', token: '', accountId: '', server: '', platform: 'mt5' });
      setTestResult(null);
      setConnectionStatus('connected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setConnectionStatus('error');
    }
  };

  const handleReconnect = (broker: BrokerConfig) => {
    const updated = brokers.map(b => b.id === broker.id ? { ...b, connected: true } : b);
    save(updated);
    setActiveBrokerId(broker.id);
  };

  const handleDisconnect = (id: string) => {
    const updated = brokers.map(b => b.id === id ? { ...b, connected: false } : b);
    save(updated);
    if (activeBrokerId === id) {
      setActiveBrokerId(null);
      setAccountInfo(null);
      setPositions([]);
      setConnectionStatus('disconnected');
    }
  };

  const handleRemove = (id: string) => {
    const updated = brokers.filter(b => b.id !== id);
    save(updated);
    if (activeBrokerId === id) {
      setActiveBrokerId(null);
      setAccountInfo(null);
      setPositions([]);
      setConnectionStatus('disconnected');
    }
  };

  const handleRefresh = () => {
    const broker = brokers.find(b => b.id === activeBrokerId);
    if (broker?.connected) {
      loadAccountData(broker);
    }
  };

  const activeBroker = brokers.find(b => b.id === activeBrokerId);

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Connection status banner */}
        {activeBroker && (
          <div className="mb-4">
            <ConnectionBadge status={connectionStatus} error={error || undefined} />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Broker Connections</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Connect MT4/MT5 accounts via MetaApi</p>
          </div>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add Broker'}
          </button>
        </div>

        {/* Add Broker Form */}
        {showAddForm && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4 uppercase tracking-wider">New Connection</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Label</label>
                <input
                  className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/40"
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
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : 'bg-[var(--glass-bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20'
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
                  className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/40 font-mono"
                  placeholder="eyJhbGciOiJSUzI1NiIs..."
                  type="password"
                  value={form.token}
                  onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Account ID</label>
                <input
                  className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/40 font-mono"
                  placeholder="account-id-from-metaapi"
                  value={form.accountId}
                  onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">Broker Server (optional)</label>
                <input
                  className="bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/40 font-mono"
                  placeholder="e.g. ICMarkets-Demo"
                  value={form.server}
                  onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            {testResult && (
              <p className={`mt-3 text-xs ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResult.message}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--glass-bg)] transition-colors disabled:opacity-50"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleConnect}
                disabled={connectionStatus === 'connecting'}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
              >
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
              </button>
              <span className="text-[10px] text-[var(--text-secondary)]">
                Token is proxied server-side — never sent from your browser directly
              </span>
            </div>

            <p className="mt-3 text-[10px] text-[var(--text-secondary)]">
              Note: For production deployments, store tokens server-side via environment variables instead of localStorage.
            </p>
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
                  activeBrokerId === broker.id ? 'border-emerald-500/25' : 'hover:border-[var(--border)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={broker.connected ? (activeBrokerId === broker.id ? connectionStatus : 'connected') : 'disconnected'} />
                  <div>
                    <span className="text-sm font-semibold text-[var(--foreground)]">{broker.label}</span>
                    <span className="ml-2 text-[10px] text-[var(--text-secondary)] font-mono uppercase">{broker.platform}</span>
                    {broker.server && (
                      <span className="ml-2 text-[10px] text-[var(--text-secondary)]">{broker.server}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${broker.connected ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}`}>
                    {broker.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  {broker.connected ? (
                    <button
                      onClick={e => { e.stopPropagation(); handleDisconnect(broker.id); }}
                      className="text-[10px] text-[var(--text-secondary)] hover:text-red-400 px-2 py-1 rounded border border-transparent hover:border-red-500/20 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); handleReconnect(broker); }}
                        className="text-[10px] text-[var(--text-secondary)] hover:text-emerald-400 px-2 py-1 rounded border border-transparent hover:border-emerald-500/20 transition-colors"
                      >
                        Reconnect
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleRemove(broker.id); }}
                        className="text-[10px] text-[var(--text-secondary)] hover:text-red-400 px-2 py-1 rounded border border-transparent hover:border-red-500/20 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Account Dashboard */}
        {activeBroker && activeBroker.connected && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StatusDot status={connectionStatus} />
                <span className="text-xs text-[var(--text-secondary)] font-semibold">{activeBroker.label}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono uppercase">{activeBroker.platform}</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loadingAccount}
                className="text-[10px] text-[var(--text-secondary)] hover:text-emerald-400 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {loadingAccount ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingAccount ? (
              <div className="glass-card p-8 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : error && !accountInfo ? (
              <div className="glass-card p-8 text-center">
                <p className="text-sm text-red-400 mb-2">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-xs text-[var(--text-secondary)] hover:text-emerald-400 transition-colors"
                >
                  Try again
                </button>
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
                  <MetricBox label="Margin Level" value={`${fmt(accountInfo.marginLevel)}%`} sub={`1:${accountInfo.leverage}`} color="text-[var(--foreground)]" />
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
                              <tr key={pos.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                <td className="py-2 font-mono font-semibold text-[var(--foreground)]">{pos.symbol}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isBuy
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    {isBuy ? 'BUY' : 'SELL'}
                                  </span>
                                </td>
                                <td className="py-2 text-right font-mono text-[var(--foreground)]">{pos.volume}</td>
                                <td className="py-2 text-right font-mono text-[var(--text-secondary)]">{fmtPrice(pos.openPrice)}</td>
                                <td className="py-2 text-right font-mono text-[var(--foreground)]">{fmtPrice(pos.currentPrice)}</td>
                                <td className={`py-2 text-right font-mono font-semibold ${posProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <div className="w-12 h-12 rounded-2xl bg-[var(--glass-bg)] flex items-center justify-center text-2xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-secondary)]">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">No brokers connected</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Add an MT4 or MT5 account via MetaApi to see live data</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              Connect Broker
            </button>
          </div>
        )}

        {/* MetaApi setup guide */}
        <div className="mt-8 glass-card p-5">
          <h2 className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mb-3">MetaApi Setup</h2>
          <ol className="flex flex-col gap-2 text-xs text-[var(--text-secondary)]">
            <li><span className="text-[var(--text-secondary)] font-semibold">1.</span> Create a free account at <span className="text-[var(--text-secondary)] font-mono">metaapi.cloud</span></li>
            <li><span className="text-[var(--text-secondary)] font-semibold">2.</span> Add your MT4/MT5 broker credentials in the MetaApi dashboard</li>
            <li><span className="text-[var(--text-secondary)] font-semibold">3.</span> Copy your API token and deployed account ID</li>
            <li><span className="text-[var(--text-secondary)] font-semibold">4.</span> Paste both above — TradeClaw connects via the MetaApi cloud bridge</li>
            <li><span className="text-[var(--text-secondary)] font-semibold">5.</span> Your token is proxied through <span className="text-[var(--text-secondary)] font-mono">/api/broker</span> server-side — it never leaves the server in production</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
